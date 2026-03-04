# Apploi Scheduling

Apploi-native interview scheduling prototype for healthcare recruiting. Replaces Calendly dependency, keeping candidates inside the Apploi ecosystem.

**Live:** [calendly-alt.vercel.app](https://calendly-alt.vercel.app)

## Stack
- Next.js 15 / React 19 / TypeScript
- Supabase (Postgres + Auth + RLS)
- Google Calendar API + Google Meet
- Resend (transactional email)
- Tailwind CSS
- Vercel (deployment)

## Features
- **Recruiter Dashboard** — Overview, bookings, analytics, meeting type management
- **Candidate Booking Flow** — Public shareable links with calendar + time slot picker
- **Google Calendar Sync** — Auto-creates events with Google Meet links
- **Email Confirmations** — Sends branded confirmation emails via Resend
- **Multi-Recruiter Support** — Organization-based team management with role-based access
- **Cancel/Reschedule** — Candidates can self-service manage their bookings
- **Analytics** — Booking volume, busiest days, peak hours, weekly trends

## Why This Exists
Apploi customers spend $7,200+/year on Calendly licensing (50 recruiters x $12/mo). This prototype demonstrates a native scheduling solution that:
- Eliminates third-party licensing costs
- Reduces speed-to-interview from days to hours
- Keeps candidates in the Apploi ecosystem
- Integrates with the Viventium unified stack vision

## Key Healthcare Metrics
- Speed-to-view at 0-2hrs = 15.7% hire rate vs 2.6% at 168+ hrs
- 73% of healthcare applications arrive off-hours
- RN time-to-fill averages 83 days nationally
- Each 1% RN turnover improvement saves ~$289K/year

## Local Development
```bash
git clone https://github.com/SterlingArcher-pixel/calendly-alt.git
cd calendly-alt
npm install
cp .env.example .env.local  # Add your Supabase + Google credentials
npm run dev
```

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `RESEND_API_KEY` — Resend API key for email confirmations
- `NEXT_PUBLIC_SITE_URL` — Deployed site URL

## Database Schema
Five core tables with RLS policies:
- `hosts` — Recruiter profiles with Google Calendar tokens
- `meeting_types` — Interview types (RN Phone Screen, CNA Interview, etc.)
- `availability_rules` — Weekly availability per recruiter
- `availability_overrides` — Date-specific overrides
- `bookings` — All scheduled interviews with status tracking

