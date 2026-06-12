<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# prediction-app-v2

Next.js 16.2.7 (App Router) + Firebase prediction contest for MRF SRC, Kottayam. All pages are `"use client"`.

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (flat config) |

No typecheck, test, or CI scripts exist.

## Config quirks

- **Two next.config files**: `next.config.ts` (active) and `next.config.mjs` (stale legacy — fewer remotePatterns). Keep only `.ts`.
- **Path alias**: `@/*` → `./src/*`
- **Tailwind v4** via `@tailwindcss/postcss` — different from v3 config.
- **ESLint flat config** in `eslint.config.mjs` — uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- **`tailwindcss` v4** — no `tailwind.config`, uses CSS `@import "tailwindcss"` + `@theme` directive.

## Firebase

- **Project**: `prediction-challenge-e7092` (`.firebaserc` default).
- **Firestore**: default DB in `asia-south1`, rules at `firestore.rules`, indexes at `firestore.indexes.json`.
- **Auth**: Google Sign-In popup only.
- **Env** (checked in `.env.local`): `NEXT_PUBLIC_FIREBASE_*` keys. Never commit real secrets here.
- **`firebase.json`** references `firestore` only — no Hosting, Functions, etc.

## Architecture

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Landing page + Google login | Public |
| `/dashboard` | Match list (Arena) | User |
| `/predict/[id]` | Submit prediction for a match | User |
| `/leaderboard` | Individual + department rankings | User |
| `/profile` | User stats & employee info | User |
| `/admin` | CRUD matches/users/notices, export Excel, toggle leaderboard | Admin only |

## Auth & setup flow

1. User clicks "Sign in to Play" → Google popup → Firestore user doc created/merged.
2. `SetupModal` component forces employee ID + department selection before allowing app access (reads from `allowedEmployees` collection).
3. Admin role is stored as `users/{uid}.role === 'admin'` — set manually in Firestore console.

## Firestore collections

- **`users`**: `{uid, name, email, role, totalPoints, employeeId, department, profileSetup}`
- **`matches`**: `{teamA, teamB, kickoffTime (Timestamp), status, result?, totalGoalsResult?}`
- **`predictions`**: `{matchId, uid, winnerPrediction, goalsPrediction, pointsAwarded?, pointsEarned?}`
- **`notices`**: `{title, content, type (info|alert|update), createdAt}`
- **`config/app_settings`**: `{isLeaderboardEnabled}` — single doc
- **`allowedEmployees`**: `{employeeId, name}` — used for ID validation

## Noteworthy patterns

- **`useMobileBackToHome`** hook (in `src/hooks/`) is used on every protected page to intercept Android back-gesture and redirect to `/`.
- **Department normalization** (`src/lib/utils.ts`): legacy `"OTHER (SAFETY, SECURITY, HR)"` maps to `"others"`. Departments: `TUBE | TYRE | MIXING | PCTR | others`.
- **Admin panel**: Real-time via `onSnapshot` on users/matches/notices/config. Prediction results are batch-written using `writeBatch` with atomic match + prediction updates + `increment` on user points.
- **Excel exports** use `xlsx-js-style` (admin panel) and `xlsx` (leaderboard rankings + master predictions report).
- **`@/lib/firebase.ts`**: Singleton Firebase init — checks `getApps().length` before `initializeApp`.

## Style conventions

- **Fonts**: DM Sans (`font-sans`) for body, Bebas Neue (`.font-bebas`) for headings/emphasis — loaded via `next/font/google` in `layout.tsx`.
- **Red color scheme** via CSS custom properties in `globals.css`.
- **framer-motion** for all animations (page elements, modals, toasts).
- **`lucide-react`** icons throughout.
- Custom `Toast` context provider in `src/components/Toast.tsx`.

## App icon

- Use `public/football.png` for the football logo in the navbar and elsewhere.
- The `FootballIcon.tsx` component is an SVG football, though the Navbar uses the PNG.

## Generated / build artifacts

- `.next/`, `out/`, `next-env.d.ts`, `*.tsbuildinfo` — all gitignored.
