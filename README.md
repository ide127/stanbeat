# StanBeat

StanBeat is a Vite + React word-search game built around a personal league loop, server-authoritative hearts, rewarded ads, Google login, and locale JSON packs.

## Stack

- Frontend: React 19, TypeScript, Zustand, Vite
- Backend: Firebase Auth, Firestore, Cloud Functions
- Ads/Rewards: AppLixir rewarded video
- Localization: `i18n/locales/*.json`, with `ko.json` as the canonical source

## Runtime Modes

StanBeat now uses two explicit runtime modes.

- `live`
  Firebase and provider configuration are present. Login, cloud sync, rewards, and callbacks are enabled.
- `disabled`
  Required live configuration is missing. Cloud-only features stay disabled instead of falling back to mock/demo behavior.

## Frontend Environment Variables

### Core

- `VITE_SITE_URL`
- `VITE_SUPPORT_EMAIL`
- `VITE_GA_MEASUREMENT_ID`

### Firebase

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### AppLixir

- `VITE_APPLIXIR_API_KEY`
  Use the real Game API key from the AppLixir dashboard.
- `VITE_APPLIXIR_SERVER_VALIDATION`
  Set to `true` when the frontend should wait for the AppLixir web callback before granting hearts.
- `VITE_APPLIXIR_SCRIPT_SRC`
  Defaults to `/lib/player.js`.

### Cloudflare Pages

Cloudflare Pages does not read your local `.env` file during Git deployments. Add the frontend variables above in the Cloudflare Pages dashboard under Project > Settings > Environment variables, scoped to Production. At minimum, production must include:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_APPLIXIR_API_KEY`

`VITE_APPLIXIR_API_KEY` is a frontend build variable and is visible in the built app, which matches the AppLixir browser integration model. Do not put `APPLIXIR_CALLBACK_SECRET` in frontend variables; keep it only in Firebase Functions / server-side secret storage.

## Server Secrets

Keep callback secrets on the server only.

- `APPLIXIR_CALLBACK_SECRET`

## AppLixir Web Callback

- Firebase Function callback URL:
  `https://us-central1-stanbeat-78d0b.cloudfunctions.net/applixirCallback`
- Dashboard setup:
  Put the callback URL above into AppLixir and use the same secret value configured in Functions.
- Development:
  You can keep `VITE_APPLIXIR_SERVER_VALIDATION=true` locally as long as the callback points to a deployed public function that AppLixir can reach.
- Verification:
  AppLixir recommends using `webhook.site` first to inspect callback payloads before switching the dashboard back to your Firebase callback URL.
- Local browser warnings:
  Test from `http://localhost:3000` or a deployed HTTPS URL. Do not use `http://0.0.0.0`, a LAN IP, or another insecure alias for ad verification. If Chrome still reports that a `Cross-Origin-Opener-Policy` header was ignored while the app is on `localhost`, the warning is usually emitted by an AppLixir/Google IMA ad frame or redirect, not by the StanBeat app shell. Treat heart grant, callback receipt, and playable ad completion as the verification signal.

## Ads.txt

AppLixir requires an `ads.txt` file at your site root. The repo keeps one at `public/ads.txt`.

## Local Development

1. Install dependencies.

```bash
npm install
npm --prefix functions install
```

2. Create env files.

- Put frontend vars in `.env.local` or `.env`
- Put server secrets in Firebase Functions config / Secret Manager

3. Start the app.

```bash
npm run dev
```

4. Build the frontend.

```bash
npm run build
```

`npm run build` regenerates `public/robots.txt` and `public/sitemap.xml` from `VITE_SITE_URL` before running Vite.

5. Build Functions.

```bash
npm --prefix functions run build
```

## Localization Workflow

`ko.json` is the canonical locale source. Every other locale must match its key set.

```bash
npm run update:locales
npm run check:locales
```

Checks include:

- key parity against `ko.json`
- mojibake detection
- placeholder parity
- English fallback leakage

## Data Model

- `users/{uid}`: user profile, hearts, terms, history, referral metadata
- `leaderboard/{uid}`: best-time and public ranking snapshot
- `stats/global`: operational counters
- `settings/botParams`: league bot tuning
- `settings/randomConfig`: league/feed tuning
- `settings/adConfig`: ad reward tuning
- `adRewards/{rewardId}`: server-validated ad rewards
- `referralRewards/{referredUserId}`: referral reward idempotency records

## Quality Checks

```bash
npm run check:quality
npm run build
npm --prefix functions run build
```

## Notes

- Static testimonials are intentional product design, but their text still comes from locale JSON.
- Admin preview/dummy users are removed. Admin screens operate on live data only.
- Production hostnames, analytics IDs, and ad provider identifiers must come from environment configuration, not hardcoded UI strings.
