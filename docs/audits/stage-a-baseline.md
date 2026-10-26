# The Longhouse — Stage A Baseline Audit

Status: **Static audit complete for primary app entry points; runtime verification pending.**  
Scope: Electron v1.5.0, main branch at audit start.  
Policy: Do not modify production application files, publish Firebase rules, or run administrative seed scripts during this audit.

## Inventory
GitHub recursive tree was complete (not truncated): 25 files, 4 directories. Primary entry points: `main.js`, `index.html`, `renderer.js`, `viewBuild.html`, `lore-tree.html`. Other relevant sources: `firebase.js`, `scripts/seedStarterBuilds.js`, `data/lore.json`, `data/militarypath.json`, `style.css`, `preload.js`, `package.json`, `package-lock.json`.

## Findings (source confirmed unless stated otherwise)

| ID | Priority | Observation | Validation / remedy |
|---|---|---|---|
| SEC-01 | P0 | Main and overlay windows use `nodeIntegration: true`, `contextIsolation: false`; renderer directly requires Electron and fs. | Replace with isolated preload, explicit allowlisted IPC. |
| SEC-02 | P0 | User-supplied build metadata interpolated into `innerHTML` in `renderer.js` (selector and profile cards). | Use `textContent` / safe DOM creation; add hostile-string tests. |
| IPC-01 | P1 | IPC window handlers do not authenticate `event.sender`; overlay scroll uses `executeJavaScript`. | Validate sender and payloads, replace dynamic execution. |
| PKG-01 | P1 | `lore-tree.html` referenced by `index.html` but omitted from explicit `build.files`. | Inspect packaged ASAR and run lore-tree smoke test. |
| TEST-01 | P1 | No tests or test script present. | Add unit and Electron smoke tests. |
| VOTE-01 | P1 | Upvote reads then overwrites entire vote array; concurrent updates may lose votes. | Use atomic update and emulator tests. Firestore rules deferred. |
| AUTH-02 | P1 | Username login queries publicly readable user documents containing emails. | Design private/public profile split; Firestore rules deferred. |
| ARCH-01 | P2 | `renderer.js` combines auth, builds, profile, data, overlay and updates. | Incremental feature isolation after baseline tests. |
| DATA-01 | P2 | Cached builds have no expiration; profile load fetches whole builds collection. | Cache invalidation and narrower queries. |
| AUTH-03 | P2 | Username uniqueness check races; auth account creation precedes profile write; async persistence setup has no error handling. | Test registration failure and session transitions. |
| UPDATE-01 | P2 | Updater immediately invokes install after download. | Test user consent and gameplay interruption. |
| DEP-01 | P2 | CDN Firebase 10.12.2 vs lockfile Firebase 12.0.0; firebase-admin runtime dependency used by seeding script. | Rationalize dependencies only after behavior tests. |
| CLEAN-01 | P3 | Empty `preload.js` and `rd`; historical BFG reports tracked. | Classify and remove only with proof of nonuse. |
| DOC-01 | P3 | README portable executable claim conflicts with NSIS installer config; SECURITY.md version conflicts with package v1.5.0. | Update docs after release check. |

## Firestore authorization (deferred by project owner)
Live rules were visually reviewed: `users` publicly readable, voting allows signed-in users to replace `upvotes` if only that field changes, and author update rules do not require immutable ownership. Do not publish rule changes during this milestone.

## Dependency inventory
`package-lock.json` lockfile v3, 741 package entries. Locked: Electron 39.8.5; electron-builder 26.0.12; Firebase 12.0.0; firebase-admin 13.4.0; electron-updater 6.6.2; @electron-forge/cli 7.8.1. **No vulnerability scan has been executed.**

## Local verification commands
Run on a disposable Windows development checkout, not production:
```powershell
npm ci
npm audit --json > npm-audit.json
npm run build
```
Inspect the generated NSIS installer and packaged app; verify that `lore-tree.html` and `data/*.json` are present. Do not use `npm run publish` or run `scripts/seedStarterBuilds.js`.

## Baseline acceptance matrix
Record PASS/FAIL, Windows version, logs, and reproduction steps:
- Fresh install, app startup, quit and restart.
- Guest browsing, clan filtering, build selection, refresh and offline/error states.
- Register, email login, username login, logout, persistence on restart, password reset.
- Build submission, validation, post-submission refresh, author deletion.
- Upvote own/other build, repeat vote, simultaneous votes from two test accounts.
- Profile owned/upvoted builds; sign-out and account switching.
- Lore JSON/tree selection, military path loading, build overlay rendering.
- Overlay lock/unlock, visibility, global hotkeys, scroll, section navigation, game focus.
- Update available/downloaded behavior and installer upgrade.
- Hostile build strings (HTML injection), malformed IPC payloads and unauthorized writes (test accounts/emulator only).

## Exit criteria for Stage A
- Inventory and issue register recorded: **done**.
- Dependency vulnerability report: **pending execution**.
- Windows installer inspection and runtime smoke tests: **pending execution**.
- No production code or Firebase data changed: **maintained**.

## Next stage
Stage B establishes a reproducible Windows baseline. Fix P0 issues on a separate PR after test coverage exists. Keep Overwolf migration and Firebase rules deployment out of scope for now.
