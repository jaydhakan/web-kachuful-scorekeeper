# backend-requests.md (template)

Create `backend-requests.md` at the repo root from this template. One section per request. Only include requests where the new design needs something the backend doesn't provide today. The UI must keep working without it (local-first, signed-out and offline).

## Summary table

| # | Feature | Screen | Priority | Client fallback in place |
|---|---------|--------|----------|--------------------------|
| 1 | | | must / should / nice | yes / no |

## Request N: <short name>

- **Screen and design element:** which screen, which element in the new design
- **What the app does today:**
- **What the new design needs:**
- **Proposed API:** method, path, request body, response body (JSON examples)
- **Data model change:** new fields or tables, migration notes, defaults for existing rows
- **Auth and permissions:** who can read or write; behaviour when signed out
- **Offline behaviour:** what the client queues, how conflicts resolve
- **Client fallback shipped meanwhile:** what the user sees until this exists
- **Open questions:**
