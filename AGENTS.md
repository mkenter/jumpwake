# Coding guide

Read `README.md` for setup and current capabilities, `docs/product.md` for scope
and functional decisions, and `docs/rules.md` for rules references and open questions.

## Code conventions

- Use Node 24, npm and the committed lockfile, React, and strict TypeScript.
- Put UI in `src/components/`, pure navigation logic in `src/engine/`, authored
  inputs in `src/data/`, and shared CSS in `src/styles/`. `App.tsx` composes the UI;
  `main.tsx` mounts it.
- Keep the engine independent of React, UI imports, and browser APIs. Its existing
  axial `q/r` coordinates are not displayed subsector column/row addresses.
- Use named exports and this component structure:

  ```text
  ComponentName/
    ComponentName.tsx
    ComponentName.test.tsx
    ComponentName.module.css
    index.ts
  ```

- Nest subcomponents inside their parent directory using the same structure.
  Use barrel exports; expose shared components through `src/components/index.ts`
  and keep internal subcomponents private.
- Use CSS Modules for component styles, `clsx` for conditional classes, and
  `motion/react` for animation. Preserve keyboard access and reduced-motion support.

## Testing and development

- Colocate tests with the code they exercise. Vitest runs engine tests in Node
  and UI tests in jsdom with React Testing Library. Import test APIs explicitly.
- Keep Playwright tests in `e2e/`; they build and test the production preview.
  Browser installation instructions are in the README.
- Prettier owns code formatting. ESLint uses the recommended JavaScript,
  TypeScript, React Hooks, and Fast Refresh rules; keep formatting rules in Prettier.
- Run checks relevant to the change: Prettier and ESLint on changed files,
  `npm run typecheck` for TypeScript changes, and affected tests via
  `npm test -- <test-file>` or `npm run test:e2e -- <spec-file>`.
  Build locally when changes affect bundling or production behavior.
- For documentation-only changes, check formatting and any changed local links.
  Rely on GitHub Actions for full formatting, lint, type, test, and build checks;
  do not routinely run the full suite locally. Report what was checked and any blockers.
- Keep changes focused. Add dependencies only for concrete needs; do not introduce
  Tailwind, component/state/routing frameworks, or speculative infrastructure.
- Keep documentation factual and concise. Update the relevant existing document
  when behavior or decisions change; avoid duplication and speculative guidance.
- Do not publish, change repository visibility, or deploy without an explicit request.
