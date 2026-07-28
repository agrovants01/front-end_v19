# Frontend Project Context

## Skills

This frontend project has skills installed in `.agents/skills/`:
- `accessibility` — WCAG 2.2 audits, screen reader support, keyboard navigation
- `seo` — meta tags, structured data, sitemap optimization
- `angular-developer` — components, signals, forms, routing, SSR, ARIA, testing
- `adev-writing-guide` — Angular documentation standards, markdown extensions
- `reference-core` — Angular `packages/core` architecture
- `reference-signal-forms` — Angular `packages/forms/signals` architecture
- `reference-compiler-cli` — Angular `packages/compiler-cli` architecture
- `pr_review` — Angular repository PR review guidelines
- `frontend-design` — production-grade UI components, Tailwind CSS
- `nodejs-best-practices` — Node.js decision-making, framework selection, security
- `typescript-advanced-types` — generics, conditional types, mapped types
- `nodejs-backend-patterns` — Express/Fastify middleware, auth, DB integration
- `bash-defensive-patterns` — robust shell scripts, CI/CD pipelines

**Rule:** The agent MUST ask the user before loading any skill. No auto-loading.

## Example confirmation
> "Do you want me to load the `angular-developer` skill for this change?"

## Git Workflow Rules

**MANDATORY:**
- **Always work on temporary branches** for new features. Never commit directly to `main` or `matias`.
- **Never commit without explicit user permission** — ask before every commit.
- **Never merge to main branches** (`main`, `matias`) without explicit permission.
- **Never push** without explicit permission.
- If the user says "comitea" or "pushea", that counts as permission for that specific action.

## Project-specific context
- Angular 12+ with TypeScript
- Angular Material components
- Leaflet for map integration
- RxJS for reactive programming
- SweetAlert2 for dialogs
- jsPDF for PDF generation
- SCSS for styling

