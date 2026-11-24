# TrailNotes – GPS walking journal (CS32005 project)

React Native (Expo SDK 58) + TypeScript. Features: local account system, GPS tracking, weather REST API, camera, SQLite storage, accessibility, light/dark theme.

## A. Run it fastest (phone, no Android Studio)
1. Install **Node 20+** (https://nodejs.org).
2. In this folder: `npm install`
3. `npx expo start`
4. On your Android phone install **Expo Go** (Play Store), scan the QR code (same Wi-Fi). *Expo Go must support SDK 58 – the Play Store version always matches the latest SDK.*
5. Tip for demos: on the Record tab switch **Simulated GPS** on – no walking needed.

## B. Get the APK (recommended for submission)
You can't build an APK without the Android SDK, so use GitHub's free build server (no Android Studio needed):
1. Create a GitHub repo and push this folder (`git init && git add . && git commit -m "TrailNotes" && git remote add origin <url> && git push -u origin main`).
2. Open the repo → **Actions** tab → **Build Android APK** → it runs automatically on push (or click *Run workflow*). It runs type-check + all tests, then builds.
3. When green (≈10–15 min), open the run → **Artifacts → trailnotes-apk** → download, unzip → `app-release.apk`.
4. Copy the APK to your phone, open it, allow “install unknown apps”. Or install via USB: `adb install app-release.apk`.
5. Submit **either** the APK **or** the GitHub link (the brief accepts both – submit both to be safe).

Alternative (local, needs Android Studio + JDK 17): `npx expo prebuild --platform android` then `cd android && ./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk`.
Alternative (Expo cloud): `npm i -g eas-cli && eas login && eas build -p android --profile preview`.

## C. Run on an emulator
Android Studio → Device Manager → create a Pixel emulator → `npx expo start` → press `a`. Set a location via emulator ⋮ → Location, or use Simulated GPS.

## D. Automated checks
```
npm run typecheck     # TypeScript strict
npm test              # 99 tests, 7 suites
npm run bundle        # full Android Metro/Hermes bundle (integration smoke test)
```

## E. Manual test checklist (do this on a real device before the demo)
| # | Steps | Expected |
|---|-------|----------|
| 1 | Create account `test1` / `walkies42` | Lands on My Walks (empty-state message) |
| 2 | Create account with weak password `abc` | Inline error, no account |
| 3 | Sign out, sign in with wrong password ×5 | Generic error, then “locked for 60 seconds” |
| 4 | Sign in correctly (after 60 s) | Success |
| 5 | Record → Start walk (allow location) walk ~50 m → Stop | Distance/time update live, weather appears (needs internet) |
| 6 | Save sheet: Add photo (allow camera) → Save | Returns to My Walks, new card with thumbnail |
| 7 | Open the walk | Stats, weather, route line, photo, notes |
| 8 | Edit title/notes → save; then Delete → confirm | Updates persist; walk disappears |
| 9 | Search a word from a title | List filters |
| 10 | Force-close the app and reopen | Still signed in; data still there |
| 11 | Deny location permission | Explanation card (+ Open Settings if “don’t ask again”) |
| 12 | Aeroplane mode, record with Simulated GPS | Walk still records and saves; weather simply absent |
| 13 | Profile → Export my data | Share sheet with JSON |
| 14 | Turn on TalkBack, swipe through each screen | Every control is announced with label/role; error messages are read |
| 15 | Settings → Font size largest; rotate to landscape | Nothing clipped, screens scroll |
| 16 | Profile → Delete account | Returns to sign-in; re-registering same username works |

## F. Requirements ↔ evidence (marking checklist)
| Brief requirement | Where |
|---|---|
| User authentication | `src/context/AuthContext.tsx`, `src/lib/security.ts` |
| API integration | `src/lib/weather.ts` (Open-Meteo) |
| GPS / sensors | `src/screens/RecordScreen.tsx` (expo-location) |
| Camera | `RecordScreen.tsx` (expo-image-picker) |
| Local storage | `src/db/*` (SQLite), SecureStore for session |
| Navigation / UX | `src/navigation/index.tsx` |
| Responsive / orientation | `Screen` max-width container, ScrollViews, `orientation: default` |
| Performance | list query without route JSON, index, `React.memo`, FlatList windowing, debounced search, wall-clock timer, resources released on unmount |
| Security | PBKDF2+salt, lockout, parameterised SQL, per-user scoping, allowBackup=false, minimal permissions |
| Accessibility | labels/roles/live regions, ≥48 dp targets, contrast tests, dark mode |
| Testing | `__tests__/` (99 tests) |
| Ethics / GDPR | local-only data, rounded coords, Export + Delete account |

## G. Demo script (5 minutes)
0:00 Intro: problem + users (15 s) · 0:15 Register (show validation) · 0:45 Record with Simulated GPS: live stats + weather · 1:45 Stop → add photo → Save · 2:30 Walk detail: route, edit, search · 3:00 Profile: totals, export, privacy, delete account · 3:30 **Technical challenge:** GPS noise filter & password-hash cost · 4:15 **Security + accessibility:** lockout, SecureStore, TalkBack demo · 4:45 Tests: show `npm test` result, questions.
Be ready to explain *every* file – you are assessed on understanding, not just the app.

## H. Academic integrity
The brief allows AI use **only if acknowledged**. This project was generated with Claude (Anthropic). Read and understand the code, modify it where you can, and **state AI use and library re-use in your report** (the report draft already has the statement – edit it to match what you actually did).
