const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me';
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'db.json');

const allowedStatuses = ['Applied', 'Interview', 'Offer', 'Rejected'];

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const applicationSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(allowedStatuses),
  appliedDate: z.iso.date(),
  source: z.string().min(1),
  notes: z.string().optional().default(''),
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*'}));
app.use(express.json());

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    const initial = { users: [], applications: [] };
    fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2));
  }
}

function readDb() {
  ensureDb();
  const content = fs.readFileSync(dataFile, 'utf-8');
  return JSON.parse(content);
}

function writeDb(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, jwtSecret, {
    expiresIn: '7d',
  });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
  }

  const db = readDb();
  const email = parsed.data.email.toLowerCase();
  const existing = db.users.find((user) => user.email === email);
  if (existing) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = {
    id: randomUUID(),
    name: parsed.data.name,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  writeDb(db);

  const token = createToken(user);
  return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
  }

  const db = readDb();
  const email = parsed.data.email.toLowerCase();
  const user = db.users.find((item) => item.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = createToken(user);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/applications', authMiddleware, (req, res) => {
  const db = readDb();
  const apps = db.applications
    .filter((appItem) => appItem.userId === req.user.sub)
    .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());

  res.json(apps);
});

app.post('/api/applications', authMiddleware, (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
  }

  const db = readDb();
  const item = {
    id: randomUUID(),
    userId: req.user.sub,
    ...parsed.data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.applications.push(item);
  writeDb(db);
  res.status(201).json(item);
});

app.put('/api/applications/:id', authMiddleware, (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
  }

  const db = readDb();
  const index = db.applications.findIndex(
    (item) => item.id === req.params.id && item.userId === req.user.sub,
  );

  if (index < 0) {
    return res.status(404).json({ message: 'Application not found' });
  }

  const updated = {
    ...db.applications[index],
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };
  db.applications[index] = updated;
  writeDb(db);

  return res.json(updated);
});

app.delete('/api/applications/:id', authMiddleware, (req, res) => {
  const db = readDb();
  const before = db.applications.length;
  db.applications = db.applications.filter(
    (item) => !(item.id === req.params.id && item.userId === req.user.sub),
  );

  if (db.applications.length === before) {
    return res.status(404).json({ message: 'Application not found' });
  }

  writeDb(db);
  return res.status(204).send();
});

app.get('/api/analytics', authMiddleware, (req, res) => {
  const db = readDb();
  const apps = db.applications.filter((item) => item.userId === req.user.sub);

  const byStatus = allowedStatuses.map((status) => ({
    status,
    count: apps.filter((item) => item.status === status).length,
  }));

  const byMonthMap = new Map();
  apps.forEach((item) => {
    const monthKey = item.appliedDate.slice(0, 7);
    byMonthMap.set(monthKey, (byMonthMap.get(monthKey) || 0) + 1);
  });

  const byMonth = [...byMonthMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, count]) => ({ month, count }));

  const total = apps.length;
  const interviews = byStatus.find((item) => item.status === 'Interview')?.count || 0;
  const offers = byStatus.find((item) => item.status === 'Offer')?.count || 0;
  const offerRate = total > 0 ? Number(((offers / total) * 100).toFixed(1)) : 0;
  const interviewRate = total > 0 ? Number(((interviews / total) * 100).toFixed(1)) : 0;

  res.json({
    totals: { total, interviews, offers, offerRate, interviewRate },
    byStatus,
    byMonth,
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
