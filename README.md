# aaronwright.ca

Aaron’s portfolio, built with Next.js and deployed on Netlify.

## Development

Run `pnpm dev`, then open
[aaronwright-dot-ca.localhost](https://aaronwright-dot-ca.localhost). The local
router proxies to `127.0.0.1:3031`. `pnpm dev:lan` exposes that same port on a
trusted local network. Ordinary test commands do not start either server.

## Tests and release QA

- `pnpm test:unit`: fast Vitest checks for routing, gesture logic, media behavior,
  Markdown sanitization, metadata, and release-report validation.
- `PLAYWRIGHT_BASE_URL=<running-app-url> pnpm test:e2e`: the existing Playwright
  suite across desktop Chrome/Safari and iPhone portrait/landscape emulation.
- `pnpm qa:run`: build production, temporarily serve it on `127.0.0.1:3032`, run
  public-portfolio browser checks and measured visitor tasks, and save repo-local
  results. The command stops its own server when finished.
- `pnpm qa:check`: verify that the latest complete run matches this checkout and
  passes comparison with the explicitly accepted baseline. Netlify requires this.

See [TASKS.md](TASKS.md) for tasks, screen sizes, slow-device conditions, baseline
review, evidence files, and the agent-assisted exploratory workflow.
