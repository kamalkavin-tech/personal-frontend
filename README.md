# VaultX Frontend

Zero-trust personal vault web app. All sensitive data is encrypted **client-side** (AES-256-GCM) before it ever leaves the browser; the server only stores ciphertext.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Radix UI**, **React Query**, and **Zod**.

## Features

- Passwords, secure notes, files/photos, identities, payment cards, API keys, secrets, journal, addresses, and contacts
- Client-side encryption with a master-password-derived key (PBKDF2 + HKDF, AES-256-GCM)
- Login, registration, JWT + refresh tokens (httpOnly cookie), and 2FA (TOTP + backup codes)
- Security Center with password health, password generator, active sessions, devices, and audit log
- Backup & restore, trash/soft-delete, folders, favorites, albums

## Getting Started

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000` and expects the API at `http://localhost:4000/api` (see `.env.example`).

```bash
# create your local env
copy .env.example .env
```

Then set `NEXT_PUBLIC_API_URL` to your backend URL (default `http://localhost:4000/api`).

## Scripts

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Start Next.js dev server on :3000      |
| `npm run build`    | Build shared package + production app  |
| `npm run typecheck`| Type-check shared package + app        |
| `npm run start`    | Start the production server            |

## Structure

```
apps/web          Next.js application
packages/shared   Shared Zod schemas + types (compiled package)
```
