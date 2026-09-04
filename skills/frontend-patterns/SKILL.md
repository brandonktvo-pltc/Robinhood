---
name: frontend-patterns
description: React and Next.js patterns — component boundaries, state placement, server vs client components, data fetching, forms, performance and accessibility. Use when building or reviewing UI code.
---

# Frontend Patterns

## Component design

**Presentational and container split, when it earns its keep.** A component that
both fetches and renders complex layout is hard to test and hard to reuse. Split
when either half becomes non-trivial — not reflexively.

**Props describe data, not implementation.** `items`, `onSelect` — not
`reduxStore`, `queryClient`.

**Composition over configuration.** A component with eight boolean props wants
to be three components or a `children` slot.

**Colocate.** Component, its styles, its tests, and its local types live
together. A shared folder is for things genuinely shared by three or more call
sites.

## State placement

Decide in this order, and stop at the first that fits:

1. **Derived** — compute it during render from existing state. Most "state" is
   this. Do not mirror props into state.
2. **Local** — `useState` in the component that owns it.
3. **Lifted** — the nearest common ancestor of the components that need it.
4. **URL** — filters, tabs, pagination, search. If it should survive a refresh
   or be shareable as a link, it belongs in the URL.
5. **Server cache** — data owned by the server. TanStack Query / SWR / RSC.
   This is not client state; do not put it in a client store.
6. **Global client store** — genuinely cross-cutting UI state only (theme,
   session, a command palette). Zustand or context. Reach here last.

`useEffect` is for synchronizing with something outside React. It is not a data
fetching primitive and it is not a place to compute derived values.

## Next.js: server vs client

- **Server Components are the default.** Add `'use client'` only when you need
  state, effects, event handlers, or browser APIs.
- Push the `'use client'` boundary **down** the tree, not up. An interactive
  button does not make its page a client component.
- Fetch data in Server Components. `await` directly; no loading state needed
  for the initial render.
- Server Actions for mutations, with validation inside the action — an action is
  a public endpoint. Never trust its input because a form produced it.
- `loading.tsx` and `error.tsx` per route segment. Streaming with `<Suspense>`
  around the slow parts, not around everything.
- Cache deliberately. Know whether each fetch is static, revalidated, or dynamic,
  and say so explicitly rather than inheriting a default you did not choose.

## Data fetching (client)

- One query key convention: `['orders', { status, page }]`. Keys are the cache
  identity — get them wrong and you get stale or duplicated data.
- Set `staleTime` intentionally per resource. The default of 0 refetches more
  than most apps need.
- Optimistic updates need a rollback path on error. Without one, a failed
  mutation leaves a lie on screen.
- Handle all four states in the UI: loading, empty, error, success. Empty is the
  one that gets skipped and the one users hit first.

## Forms

- A schema (zod) is the single source of truth for validation, shared between
  client and server.
- Validate on blur, re-validate on change once a field has errored. Validating
  on every keystroke from the start is hostile.
- Disable submit while submitting and show progress. Double-submit protection
  server-side too — the client is not a security boundary.
- Errors sit next to their field, referenced by `aria-describedby`.

## Performance

- Measure before optimizing. React DevTools Profiler, then Lighthouse.
- `memo` / `useMemo` / `useCallback` are for measured problems. Applied
  reflexively they add allocation and cognitive cost for nothing.
- Stable keys in lists — a database id. Array index keys corrupt state on
  reorder.
- Code-split at the route level first, then at genuinely heavy components
  (editors, charts, maps) with `dynamic`/`lazy`.
- Images through the framework's image component with explicit dimensions.
  Layout shift is a real user-facing bug.
- Virtualize lists past a few hundred rows.

## Accessibility

- Semantic elements first. `<button>` for actions, `<a href>` for navigation.
  A `<div onClick>` is not keyboard reachable and not announced.
- Every interactive element reachable and operable by keyboard, with a visible
  focus indicator.
- Every form control has a label. Placeholder is not a label.
- Live regions for async status. Focus management on route change and on
  dialog open/close.
- Colour contrast at least 4.5:1 for body text. Never encode meaning in colour
  alone.
