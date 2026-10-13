# MR Music

A Vite + React 19 + TypeScript music streaming application powered entirely by **Supabase** (PostgreSQL, Supabase Auth, Supabase Storage, Row Level Security) and deployed on **Vercel**.

## Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, Framer Motion, Zustand state management
- **Database**: Supabase PostgreSQL with relational schema and Row Level Security (RLS)
- **Authentication**: Supabase Auth (Email/Password, Google OAuth, Session persistence)
- **Storage**: Supabase Storage buckets (`songs`, `covers`, `avatars`)
- **Deployment**: Vercel

## Getting Started

### 1. Environment Setup

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
```

Set your Supabase credentials:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
VITE_ADMIN_PIN="your-admin-pin"
```

### 2. Database Schema

Run the complete PostgreSQL migration script in your Supabase SQL Editor:
- Execute `supabase-schema.sql` (found in project root).
- This creates the tables (`profiles`, `songs`, `artists`, `albums`, `playlists`, `playlist_songs`, `liked_songs`, `saved_albums`, `followed_artists`, `listening_history`, `downloads`), creates indexes, configures RLS policies, auto-generates user profile triggers, and creates storage buckets.

### 3. Local Development

```bash
npm install
npm run dev
```

### 4. Production Build & Deployment

```bash
npm run build
```

Deploy to Vercel:
1. Connect the GitHub repository to Vercel.
2. In Vercel Project Settings → Environment Variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Configure Google OAuth in Supabase Dashboard (Auth → URL Configuration → Add Vercel domain to Redirect URLs).
