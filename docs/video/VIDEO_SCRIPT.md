# Video Script (4–6 minutes)

## Intro (0:00–0:30)

Hi, I’m Andreas. In this video, I’ll show how I built this Job Application Tracker and how I used an AI coding assistant as a practical pair programmer.

This project is a full-stack app with React and TypeScript on the frontend, plus an Express API with JWT auth on the backend.

I’ll walk through the product, architecture, and exactly where AI accelerated my development without replacing engineering judgment.

## Product Demo (0:30–1:30)

Here’s the app running locally.

First, users can register and log in.

After authentication, they land on the dashboard where they can add applications with company, role, status, date, source, and notes.

Each record appears in the applications table, and the analytics area updates in real time.

The dashboard includes key hiring metrics like total applications, interviews, offers, offer rate, plus a monthly trend and status distribution chart.

## Architecture (1:30–2:20)

At a high level, this is split into two apps:

- client: React + Vite + TypeScript + React Query + React Hook Form + Recharts
- server: Express + JWT + bcrypt + Zod validation

The frontend calls API endpoints for register, login, applications CRUD, and analytics.

The backend validates payloads with Zod, hashes passwords, signs JWTs, and enforces auth middleware for protected routes.

## How I Used AI Coding Assistant (2:20–4:30)

I used AI in four specific phases.

Phase one: scaffolding.

I asked AI to scaffold a clean full-stack structure with scripts and baseline routing. This reduced setup time and let me focus on business logic.

Phase two: feature implementation.

I used AI to draft forms, API service calls, and analytics chart components. I then reviewed and adapted the code to match project needs.

Phase three: debugging and reliability.

When registration failed in the UI, I used AI to trace request flow and improve error handling. Now users see clear messages like “Email already exists” or “Cannot connect to API.”

Phase four: documentation and developer experience.

I used AI to draft a recruiter-friendly README, setup instructions, and this video kit so reviewers can quickly validate the project.

## Engineering Ownership (4:30–5:10)

The key point is that AI generated options, not final authority.

I still validated builds, tested live endpoints, verified git push integrity, and made final implementation decisions.

So my workflow is: prompt, inspect, adapt, verify, then ship.

## Closing (5:10–5:30)

Thanks for watching. If you’d like, I can also walk through how I’d productionize this next with database persistence, CI tests, and role-based access.
