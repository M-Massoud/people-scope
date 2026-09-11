# Contributing to PeopleScope

Start with the [README](README.md), [architecture](docs/ARCHITECTURE.md), and [design guide](DESIGN.md). [AGENTS.md](AGENTS.md) gives coding assistants the same project boundaries and working conventions.

## Local setup

Use Node.js 20.9 or later and npm. Node.js 24 has been used for project verification.

```bash
npm ci
npm run dev
```

The development server defaults to port 3000. No API key, environment file, or database is needed. Loading live profiles and portraits requires network access to Random User. The first production build also needs access to Google Fonts for `next/font/google`; the built app serves those font assets locally. Use `npm install` when deliberately updating dependencies, and include the resulting `package-lock.json` change.

## Making a change

1. Place the change in the module that owns its behavior. Keep pages and API handlers small.
2. Reuse existing components and pure helpers. Expose a named export only when another folder needs it.
3. Update the relevant API, architecture, data-source, or design documentation if the contract or convention changes.
4. Run the checks appropriate to the change and review the final diff.

Keep each change focused. Include a regression test for a behavioral bug when practical; copy-only edits do not need new tests. Use API-shaped fixtures for automated checks, so tests do not depend on external service availability.

## Checks

| Change                                               | Verification                                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation or copy                                | Check formatting, links, and `git diff --check`; inspect the affected UI for visible copy changes.                                       |
| Filtering, aggregation, or provider behavior         | Run `npm test` and `npm run typecheck`. Cover relevant empty, invalid, and boundary cases.                                               |
| Components, URL state, or charts                     | Run type checking and the relevant Playwright tests after a fresh production build. Inspect desktop/mobile layout and keyboard behavior. |
| Dependencies, configuration, or cross-module changes | Run the full sequence below.                                                                                                             |

Full verification:

```bash
npm test
npm run build
npm run typecheck
npm run test:e2e
```

The build runs before type checking in this sequence so Next.js route types are available on a clean checkout. If a standalone type check reports missing generated Next.js types, build first and rerun it.

Playwright starts a production server on port 3101, which must be free. Install Chromium once before the first browser run:

```bash
npx playwright install chromium
```

On a Linux CI image missing browser system libraries, use `npx playwright install --with-deps chromium` during environment setup. Browser tests intercept application API calls with fixtures; provider unit tests verify upstream parsing and caching separately.

Run one browser file after building:

```bash
npm run test:e2e -- e2e/world-map.spec.ts
```

Prettier is installed. Format only the files you intentionally changed; for example:

```bash
npx prettier --write src/modules/heatmap/components/world-panel.tsx
npx prettier --check AGENTS.md CONTRIBUTING.md
git diff --check
```

There is currently no lint script or automated module-boundary enforcement. Type checking and tests cover their own concerns; review dependency direction separately using the architecture guide. [Verification notes](docs/VERIFICATION.md) record past checks, not a continuously updated status badge.

## Commits and reviews

Use a conventional commit subject that describes the resulting change:

```text
feat(heatmap): add average-age coloring
fix(people): keep empty search results compact
docs(architecture): document feature boundaries
```

A review description should explain the problem, resulting behavior, and checks performed. Include a screenshot for a visible change when useful. Record limitations honestly rather than claiming unrun checks passed.

Do not commit `node_modules`, `.next`, test artifacts, environment files, or credentials. Avoid changing generated `next-env.d.ts` solely because a local development/build command rewrote it.
