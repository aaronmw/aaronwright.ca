# Project release QA

- Read `TASKS.md` for visitor tasks, performance profiles, recorded evidence, and
  the agent-assisted exploratory workflow.
- Before publishing this project, run `pnpm qa:check`. A missing, incomplete,
  failing, or stale report blocks release. This also applies to direct Netlify
  publish commands that bypass the repository build command.
- For performance failures, include the quick evidence, changed-code, and
  primary-source research triage in `TASKS.md` before diagnosing a regression,
  repeating the full scan, or handing off a blocked release.
- `pnpm qa:run` builds and temporarily serves production on an OS-assigned loopback port.
  Follow the global process-authorization rule before starting it; do not reuse
  or stop an unrelated server.
- Do not skip a failing task, relax an assertion/budget, or replace a baseline
  just to pass the gate. Record an intentional contract change and its reason.
  Keep the QA results with the tested changes; store bulky evidence in ignored
  `test-results/qa/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
