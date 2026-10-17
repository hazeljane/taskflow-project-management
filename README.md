# TaskFlow Admin — Project Management System

A full-stack starter using React + Vite + Tailwind CSS, Node.js + Express, and MongoDB.
It includes cookie-based authentication, hashed passwords, server-side role checks, project assignment, progress updates, submissions, and review/revision workflow.

## Requirements
- Node.js 20+
- MongoDB local install or MongoDB Atlas connection string

## 1. Install and configure the API

```bash
cd server
cp .env.example .env
npm install
```

Edit `server/.env` and set `MONGO_URI`, `JWT_SECRET` (use a long random secret), `CLIENT_ORIGIN`, and the admin seed credentials.

Seed the first admin account:

```bash
npm run seed:admin
```

Start the API:

```bash
npm run dev
```

API defaults to `http://localhost:5000`.

## 2. Install and run the React app

In a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Demo workflow
1. Sign in with the admin email/password configured in `server/.env`.
2. Create a project and assign it to a team member.
3. Register a team member account from the login screen (or sign out and choose Create account).
4. As a team member, update progress and submit a project update.
5. Sign back in as admin and review the submission. Approve it or request revisions.
6. Team members can see the review status and feedback.

## Security notes
- Passwords are hashed with bcryptjs.
- Authentication uses a JWT in an HttpOnly cookie; the browser JavaScript cannot read the token.
- API routes enforce roles and project ownership on the server.
- Helmet, rate limiting, input validation, and same-site cookie settings are included.
- Public registration always creates a `member`; it cannot create an admin.
- For production, serve frontend and API over HTTPS, use a strong unique JWT secret, configure a specific `CLIENT_ORIGIN`, add CSRF protection appropriate to your deployment, add email verification/password reset, and use managed secrets. Do not use the demo seed password in production.
- This starter stores submission URLs and notes, not uploaded binary files. Add validated object storage (e.g. S3) if file uploads are needed.

## Main routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users` (admin)
- `GET /api/projects`
- `POST /api/projects` (admin)
- `PATCH /api/projects/:id` (admin)
- `PATCH /api/projects/:id/progress` (assigned member)
- `POST /api/projects/:id/submissions` (assigned member)
- `GET /api/submissions` (admin sees all, member sees own)
- `PATCH /api/submissions/:id/review` (admin)

## Project structure
```text
client/   React/Vite/Tailwind UI
server/   Express API, Mongoose models, auth middleware, seed script
```
