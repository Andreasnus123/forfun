# Job Application Tracker

A full-stack Job Application Tracker built with React + Express API, including authentication and analytics dashboards.

## Features

- User registration and login with JWT authentication
- Add and delete job applications
- Track application status (`Applied`, `Interview`, `Offer`, `Rejected`)
- Analytics dashboard:
  - Total applications
  - Interview and offer counts
  - Offer/interview rates
  - Monthly application trend chart
  - Status distribution chart

## Tech Stack

- Frontend: React (Vite + TypeScript), React Router, TanStack Query, React Hook Form, Zod, Recharts
- Backend: Node.js, Express, JWT, bcryptjs, Zod
- Storage: Local JSON database (`server/data/db.json`) for quick setup/demo

## Project Structure

```
.
├── client/                 # React frontend
├── server/                 # Express API
└── README.md
```

## Prerequisites

- Node.js 18+
- npm 9+

## Run the Project

### 1) Install dependencies

```bash
npm install
npm install --prefix client
npm install --prefix server
```

### 2) Configure environment

Create these files:

- `server/.env` (copy from `server/.env.example`)
- `client/.env` (copy from `client/.env.example`)

Example `server/.env`:

```env
PORT=4000
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_ORIGIN=http://localhost:5173
```

Example `client/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

### 3) Start both frontend and backend

```bash
npm run dev
```

App URLs:

- Frontend: http://localhost:5173
- API: http://localhost:4000

## Build

```bash
npm run build
```

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/applications` (auth)
- `POST /api/applications` (auth)
- `PUT /api/applications/:id` (auth)
- `DELETE /api/applications/:id` (auth)
- `GET /api/analytics` (auth)

## Demo: How I Used an AI Coding Assistant

To increase hiring impact, here is a practical workflow you can show in interviews:

### 1) Scaffolding and architecture

Prompt used:

> "Set up a full-stack Job Application Tracker with React frontend and Express backend, including JWT auth and analytics endpoints."

What AI accelerated:

- Initial folder structure and baseline setup
- Auth and API flow scaffolding
- Faster first working version

### 2) Feature implementation

Prompt used:

> "Create a dashboard with application form, applications table, monthly bar chart, and status pie chart."

What AI accelerated:

- Form schema and validation patterns
- API integration boilerplate
- Recharts component setup

### 3) Code quality pass

Prompt used:

> "Review this code for edge cases, auth handling, and type safety."

What AI accelerated:

- Error handling improvements
- Type and payload consistency
- Small refactors to reduce duplication

### 4) Documentation and dev-experience

Prompt used:

> "Write a production-style README with setup, env vars, scripts, API list, and project summary for recruiters."

What AI accelerated:

- Clear onboarding docs
- Better project presentation
- Faster handoff to reviewers/interviewers

### How to present this in interviews

Use this line:

> "I use AI as a pair programmer for scaffolding, refactoring, and docs, then I validate logic with tests/manual verification and own all final decisions."

This shows speed + engineering judgment.
