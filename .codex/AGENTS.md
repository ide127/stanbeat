# StanBeat Harness

- Default dev server: `npm run dev`
- Default local URL: `http://localhost:3000`
- Default static gate: `npm run check:quality`
- Default browser smoke gate: `npm run verify:expect`
- Default full harness: `npm run verify:harness`

## Environment modes

- Native Windows Codex is the canonical mode for this repo's full harness because Expect browser verification is already wired there.
- WSL Codex is the safer hook-enabled mode for long-running autonomous work, but this repo currently lives on a mounted Windows path.
- If you run Codex from WSL against `/mnt/c/.../stanbeat`, prefer hook-driven coding plus Windows-side browser verification.
- If you want fully Linux-native verification inside WSL, use a separate WSL copy of the repo and install dependencies there with Linux `npm ci`.

## Required workflow

- For any change that affects runtime behavior, game flow, auth, ads, hearts, leaderboard, i18n rendering, modals, routing, or browser-visible UI, always run the full harness before claiming completion.
- The minimum completion bar is:
  1. implement the change
  2. run static verification
  3. run Expect smoke verification
  4. run additional Expect flow checks for the changed screen or user journey
  5. fix any issue found and rerun verification

## StanBeat-specific verification notes

- If the home screen, menu, language switching, or hero UI changes, verify the home screen and at least one adjacent interaction.
- If gameplay, hearts, league ranking, login, or rewarded ads change, verify the exact end-to-end flow that changed, not just the home page smoke check.
- If Firebase, Cloud Functions, or Firestore rules change, run static verification first, then verify the browser flow that depends on those changes.
- Never treat a passing build alone as sufficient for user-facing changes.
- If working from WSL on `/mnt/c/...`, do not assume the local Linux `node_modules` state matches the Windows install. Use Windows `npm run verify:harness` for the final browser evidence unless you are in a dedicated WSL copy.
