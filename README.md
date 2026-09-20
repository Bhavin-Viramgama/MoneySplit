# MoneySplit — Friend-to-Friend Finance Ledger

A personal finance ledger for tracking money between friends. Built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 19, TypeScript 6, Vite 8, Tailwind CSS 4
- **Auth**: Supabase Auth (synthetic email pattern — username-only interface)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage (future milestone)
- **Hosting**: Vercel (frontend) + Supabase (backend services)

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <your-repo>
cd hisaab
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase project credentials:
- `VITE_SUPABASE_URL` — from Supabase Dashboard → Settings → API
- `VITE_SUPABASE_ANON_KEY` — the **anon/public** key (not the service role key)

### 3. Configure Supabase Auth

In your Supabase Dashboard:

1. Go to **Authentication → Providers → Email**
2. Set **"Confirm Email"** to **OFF**
3. Go to **Authentication → Providers → Phone**
4. Set **"Confirm Phone"** to **OFF**

This is required because the app uses synthetic emails (`username@moneysplit.local`) for authentication. These are not real mailboxes.

### 4. Apply database migrations

In Supabase Dashboard → **SQL Editor**, run:

- `supabase/migrations/001_profiles.sql`

To rollback: `supabase/migrations/001_rollback.sql`

### 5. Start development server

```bash
npm run dev
```

Open http://localhost:5173

## Architecture

### Authentication Strategy: Synthetic Email

Users register and log in with a **username + password**. Internally, the app constructs a deterministic synthetic email (`{username}@moneysplit.local`) for Supabase Auth. This email is:

- Never shown to users
- Never stored in profile tables
- Not a real email address

**Trade-offs:**
- Username existence is disclosed during registration (acceptable — usernames are public identifiers)
- Password recovery requires a Supabase Edge Function (deferred to Milestone 2)
- Username changes require an Edge Function to update both the profile and auth identity (future milestone)

### Profile Data Separation

- `profiles` — public data (username, display name, avatar). Readable by any authenticated user.
- `private_profiles` — sensitive data (recovery email). Readable only by the owner.

This separation exists because PostgreSQL RLS operates on rows, not columns.

## Project Structure

```
src/
├── app/                  # App shell, routing, layout
├── components/ui/        # Shared UI components
├── features/
│   └── auth/             # Authentication feature module
│       ├── components/   # LoginForm, RegisterForm, AuthLayout
│       ├── hooks/        # useAuth context
│       ├── pages/        # LoginPage, RegisterPage
│       └── services/     # auth.service.ts
├── lib/                  # Supabase client, constants, validation
├── types/                # TypeScript type definitions
└── index.css             # Design system

supabase/
└── migrations/           # SQL migrations with rollback scripts
```

## Known Limitations (Milestone 1)

- **No password recovery** — Users who forget their password cannot recover their account. Planned for Milestone 2.
- **No username changes** — Usernames are immutable after registration. Planned for a future milestone.
- **No recovery email collection** — Planned for Milestone 2.
- **No friend invitations, finance tracking, or settlements** — Coming in Milestones 2–4.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run linter |

## Security

- **Service-role key** is NEVER used in frontend code
- **RLS** is enabled on all application tables
- **Passwords** are managed by Supabase Auth (bcrypt) — never in application tables
- **Synthetic emails** are never exposed to users
- **Environment secrets** are excluded from git via `.gitignore`

## License

Private project.
