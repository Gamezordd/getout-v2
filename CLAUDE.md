# getout-v2 — Claude Code Rules

## Project
A revamp of a group decision voting app. Users create groups, propose options, and vote collaboratively. Built with Next.js 14 (Pages Router), TypeScript, Tailwind CSS, MobX, NeonDB (Postgres via serverless), Upstash Redis, Pusher (realtime), Firebase (auth), and Mapbox.

---

## Code Rules

### Modularity & Reusability
- Every component must do one thing. If it does two things, split it.
- All reusable UI lives in `components/ui/`. Feature-specific components live in `components/<feature>/`.
- API logic lives in `lib/` (db queries, external clients, helpers) — never inline in route handlers.
- Route handlers in `pages/api/` are thin: validate input → call a `lib/` function → return response.
- No logic duplication. If you write the same thing twice, extract it.

### File Size
- Hard limit: **300 lines per file** (enforced by ESLint). If you're approaching the limit, split the file before finishing.

### TypeScript
- No `any`. Use `unknown` and narrow it, or define a proper type.
- Define shared types and interfaces in `types/`. Co-locate component-only types with their file.
- Prefer `type` over `interface` unless declaration merging is needed.

### Styling
- Tailwind only — no inline `style` props, no CSS modules unless unavoidable.
- No magic numbers in class names. Use Tailwind theme extensions in `tailwind.config.js` for colors and spacing.

### State Management
- Global/shared state: MobX stores in `stores/`. One store per domain (e.g., `GroupStore`, `VoteStore`).
- Local UI state: `useState` / `useReducer`. Don't push local state into MobX.
- Server state (fetched data): keep in MobX stores or SWR — do not duplicate in both.

### API & Data
- All DB access goes through `lib/db/` — never import `@neondatabase/serverless` directly in components or API routes.
- All Redis access goes through `lib/cache/`.
- Validate all API inputs server-side before touching the DB.
- Return consistent JSON shapes: `{ data: T }` on success, `{ error: string }` on failure.

### Realtime (Pusher)
- Pusher server client lives in `lib/pusher/server.ts`. Client-side hook in `lib/pusher/client.ts`.
- Channel and event names are constants defined in `lib/pusher/events.ts` — never hardcode strings inline.

### Components
- All components are functional — no class components.
- Props interfaces are defined directly above the component.
- No default exports from `lib/` or `stores/` — named exports only. Default exports are fine for page files and components.

### Commits
- Commit often, with scoped messages: `feat(vote):`, `fix(api):`, `refactor(group):`, etc.

---

## Directory Structure
```
getout-v2/
├── components/
│   ├── ui/          # generic, reusable UI (Button, Modal, Card, etc.)
│   └── <feature>/   # feature-scoped components
├── lib/
│   ├── db/          # neon db queries
│   ├── cache/       # upstash redis helpers
│   ├── pusher/      # pusher server + client + event constants
│   └── auth/        # firebase auth helpers
├── pages/
│   ├── api/         # thin route handlers only
│   └── ...          # page files
├── stores/          # mobx stores
├── types/           # shared TypeScript types
├── styles/
└── public/
```
