# Petty Bounty — Admin console

The administrator web app: a Vue 3 + Vite SPA that talks to the same FastAPI backend as the
Flutter client. It is one of the four projects in this workspace (see the root `CLAUDE.md`).

## What an administrator may do here

The scope is **content moderation and money**, and it is deliberately narrow:

| Screen | Does |
|---|---|
| Overview | Queue depth, cases awaiting payout, active searches |
| Missing pets | Browse every report, read its full sighting timeline (dismissed entries included), remove one that breaks the guidelines |
| Moderation | Work the flag queue: dismiss a flag, or uphold it — withdrawing the sighting and deducting the hunter's score |
| Bounty | Rule on the bounty payments the owner and the hunter could not settle: confirm or reject a disputed or unconfirmed payment, or close an unpaid report |

Two powers this console does **not** have, both by decision rather than omission:

- **No account management.** Nobody is banned, suspended, or deactivated. The account
  requirements were struck on 2026-08-21; the sanction for an abusive hunter is the bounded,
  audited score deduction above (`score_penalties`).
- **No sighting adjudication.** Whether a photograph shows a particular animal is a
  question only that animal's owner can answer, so the Pet Owner confirms or rejects each
  sighting and closes their own search — which is also what distributes the ranking points.
  `verification_status` survives here purely as moderation: 'Dismissed' withdraws
  a sighting, and 'Verified' exists only to reverse that.

## Architecture

```
src/
  api/http.ts       one door to FastAPI: bearer header, envelope unwrap, ApiError
  api/auth.ts       Supabase Auth (GoTrue) over fetch — sign-in only
  api/admin.ts      one function per /admin route
  stores/auth.ts    session + server-checked admin role
  types/domain.ts   mirrors the PostgreSQL enums in sql-update.txt
  views/            one per screen, plus LoginView
  components/       Common/ (badge, dialogs, paging) and per-feature folders
```

The **golden rule** applies here as it does to Flutter: the database is reached only
through FastAPI. Supabase is called directly for authentication and nothing else, and the
admin role is read back from `GET /auth/me` rather than decoded out of the JWT, because
`require_admin` is the authority on it.

## Setup

```sh
npm install
cp .env.example .env.local     # then edit if your backend is not on 127.0.0.1:8000
npm run dev                    # http://localhost:5173
```

The backend must be running (`uvicorn app.main:app --reload` in `Petty_Bounty_Backend/`)
and you must sign in with an account whose `users.role` is `admin` — anything else is
refused at the login screen.

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | FastAPI gateway. Defaults to `http://127.0.0.1:8000`. |
| `VITE_SUPABASE_URL` | Supabase project, used for sign-in only. |
| `VITE_SUPABASE_ANON_KEY` | Publishable key. Designed to ship in a client. |

## Scripts

```sh
npm run dev          # dev server with HMR
npm run type-check   # vue-tsc
npm run build        # type-check + production build
npm run format       # prettier
```

## Editor setup

[VS Code](https://code.visualstudio.com/) +
[Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar), with Vetur
disabled. TypeScript cannot type `.vue` imports on its own, which is why `vue-tsc` replaces
`tsc` for type checking and why Volar is needed in the editor.
