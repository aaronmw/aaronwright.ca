# Project release QA

- Read `TASKS.md` for visitor tasks, performance profiles, recorded evidence, and
  the agent-assisted exploratory workflow.
- Before publishing this project, run `pnpm qa:check`. A missing, incomplete,
  failing, or stale report blocks release. This also applies to direct Netlify
  publish commands that bypass the repository build command.
- `pnpm qa:run` builds and temporarily serves production on loopback port 3032.
  Follow the global process-authorization rule before starting it; do not reuse
  or stop an unrelated server.
- Do not skip a failing task, relax an assertion/budget, or replace a baseline
  just to pass the gate. Record an intentional contract change and its reason.
  Keep the QA results with the tested changes; store bulky evidence in ignored
  `test-results/qa/`.
