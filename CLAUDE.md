# <Project name> — working notes

<One line: what this app is and who uses it.> All data comes from <the API / backend name>.

Most conventions are already written down — read these rather than re-deriving them:
[`CONTRIBUTING.md`](CONTRIBUTING.md) (PR checklist, naming, comments, testing),
[`docs/codebase/ARCHITECTURE.md`](docs/codebase/ARCHITECTURE.md) (layering, state, data fetching),
[`docs/codebase/DESIGN-SYSTEM.md`](docs/codebase/DESIGN-SYSTEM.md) (tokens).

## Stack — what this is NOT

**<Bundler> + <UI library> + <Router> + <Styling> + <HTTP client> + <Validation> + <Test runner>.**

List the tools people might assume are here but aren't (for example another framework, a
data-fetching library, a component kit). Don't reach for them.

## Commands — <package manager>, not others

Only `<lockfile>` exists; commands from another package manager fail. Node <version range>.
If typechecking is partial (opt-in per file, or only some folders), say which parts are covered.
A green typecheck does not mean the whole app is typed.

## Reuse before you write

| Need                  | Use                                               |
| --------------------- | ------------------------------------------------- |
| Dates, numbers, text  | The shared formatting utils in `src/utils/`       |
| Network               | `src/api/`, one module per API area. No HTTP calls in components. |
| UI primitives         | `src/components/ui/`                              |
| Shared types, schemas | `src/types/`                                      |

Note any data quirks that cause bugs (for example timestamps without a timezone, ids as
strings, money in minor units) and name the helper that handles each one.

## Rules

- **Git:** never add, commit, push, branch, or touch `.env*` / CI config unless asked.
- **No new dependency** without asking first.
- **No temporary fixes.** Fix the root cause. If the right fix belongs to another system (backend,
  config, infra), say so and stop. No workarounds, shims or hard-coded stand-ins to paper over it.
- **Design tokens only.** No hardcoded colours, font sizes or off-scale spacing. Lint enforces it.
- **Comments: 1–3 lines**, non-obvious _why_ only. No narration, no section banners.
- Touching more than ~3 files: outline the plan and wait.
- Match the surrounding file's style over any general preference.
- Every screen that fetches data needs loading, empty, no-results and error states.
- Accessibility is part of done: real buttons and labels, keyboard and focus handling, visible focus rings.
- Say plainly when something is stubbed, mocked or unverified. Never claim it works unrun.
- keep commits small but never add your name in commit as co-author