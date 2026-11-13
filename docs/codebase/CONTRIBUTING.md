# Contributing

- **Package manager:** npm only (`package-lock.json`). Node 20+.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`), one concern per commit. Never mix a refactor with a behaviour change. Domain tests land before the code they cover.
- **PR checklist:** `npm run verify` (format check, lint, typecheck, unit tests) and `npm run build` pass, and `npm run test:e2e` for anything a browser can see. Screens that fetch or load data need loading, empty and error states.
- **Naming:** components `PascalCase.tsx`, hooks `useThing.ts`, domain modules `camelCase.ts`. One screen per file in `src/games/<game>/screens/` (site-wide pages in `src/platform/pages/`), one sheet per file in `src/games/<game>/sheets/`.
- **Comments:** 1–3 lines, only the non-obvious why. No narration or section banners.
- **Colours and sizes:** design tokens only (Tailwind theme / CSS variables). Lint rejects hex literals in components.
- **Strings:** every user-visible string lives in `src/strings/` (shared, and `platform.ts` for the landing page) or `src/games/<game>/strings/`.
- **Testing:** Vitest for each game's `domain/` and `state/`, React Testing Library for flows, Playwright (`npm run test:e2e`) for the browser. The responsive audit runs a three-viewport subset inside `test:e2e`; `RESPONSIVE_FULL=1 npm run test:e2e` runs every viewport and player count, and `RESPONSIVE=1` writes reports without failing (`node tools/responsive/report.mjs <label>`). Parallel runs need their own server: set `E2E_PORT`.
