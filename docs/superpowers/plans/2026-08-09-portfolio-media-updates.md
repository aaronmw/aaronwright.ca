# Portfolio Media Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in restart control to the NextPhrase intro video and publish the refreshed six-slide Aaron's Toolbox sequence.

**Architecture:** Keep restart behavior local to `ZoomableScreenshot`, where the existing zoom surface and its video element are both available. Opt individual media into the control through `PortfolioScreenshot.restartable`, and keep Aaron's Toolbox ordering declarative in the existing project data.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Font Awesome solid icons, Vitest, Netlify

## Global Constraints

- Work directly on local `main`, as requested.
- Do not start, stop, or restart a development server.
- Keep `package.json`, `package-lock.json`, and `tsconfig.json` out of the release.
- Preserve the existing autoplay, loop, muted, phone clipping, and double-click zoom behavior.
- Only the NextPhrase intro video opts into the restart control.
- Aaron's Toolbox order is overview, Normalizer, Randomizer, Componentizer, Distributor, Selection Saver.
- Ask Aaron for visual review before committing and deploying.

---

### Task 1: NextPhrase Restart Control

**Files:**
- Modify: `lib/portfolio.ts`
- Modify: `components/portfolio/presentation/PortfolioMedia.tsx`

**Interfaces:**
- Consumes: `PortfolioScreenshot`, `useInlineMediaZoom`, `CircularIconButton`, and Font Awesome `faRotateRight`
- Produces: optional `PortfolioScreenshot.restartable?: boolean` and an active-slide restart overlay

- [x] **Step 1: Add the opt-in media property and enable it for the intro**

```ts
export type PortfolioScreenshot = {
  id: string;
  slug: string;
  src: string;
  alt: string;
  animated?: boolean;
  clipToPhoneFrame?: boolean;
  restartable?: boolean;
};

{
  id: 'nextphrase-intro',
  slug: 'intro',
  src: '/portfolio/nextphrase/intro-video.webm',
  alt: '1 of 10: NextPhrase app walkthrough',
  clipToPhoneFrame: true,
  restartable: true,
}
```

- [x] **Step 2: Pass the opt-in state into `ZoomableScreenshot`**

Add `restartable={slide.screenshot.restartable}` at the project-panel call site and declare the optional boolean prop on `ZoomableScreenshot`.

- [x] **Step 3: Add immediate single-click restart behavior**

```ts
const handleRestart = (event: ReactMouseEvent<HTMLButtonElement>) => {
  if (event.detail > 1) {
    return;
  }

  const video = surfaceRef.current?.querySelector('video');

  if (!video) {
    return;
  }

  video.currentTime = 0;
  void video.play();
};
```

Do not stop propagation. The second click is ignored by the restart handler, while the browser's `dblclick` event continues to the existing zoom handler.

- [x] **Step 4: Render the active-slide overlay above the media content**

Use `CircularIconButton` with `faRotateRight`, `aria-label="Restart animation"`, and `title="Restart animation"`. Render it only when `active && restartable`, center it with absolute positioning, size it to 88px, use a translucent white background with backdrop blur, transition opacity/scale/color, reveal it from the zoom surface's named group hover or button focus, and disable transitions for reduced motion.

### Task 2: Aaron's Toolbox Slides

**Files:**
- Modify: `lib/portfolio.ts`
- Include updated assets: `public/portfolio/aarons-toolbox/store-images--normalizer.png`
- Include updated assets: `public/portfolio/aarons-toolbox/store-images--randomizer.png`
- Include updated assets: `public/portfolio/aarons-toolbox/store-images--componentizer.png`
- Add asset: `public/portfolio/aarons-toolbox/store-images--distributor.png`
- Include updated assets: `public/portfolio/aarons-toolbox/store-images--selection-saver.png`

**Interfaces:**
- Consumes: the existing Aaron's Toolbox `screenshots` array
- Produces: six route-addressable slides with accurate ordinal alt text

- [x] **Step 1: Insert Distributor between Componentizer and Selection Saver**

```ts
{
  id: 'distributor',
  slug: 'distributor',
  src: '/portfolio/aarons-toolbox/store-images--distributor.png',
  alt: '5 of 6: Distributor',
}
```

- [x] **Step 2: Renumber all Aaron's Toolbox alt text**

Use `1 of 6` through `6 of 6` in the final slide order, keeping existing IDs, slugs, and filenames unchanged for the other five slides.

### Task 3: Verification And Release Gate

**Files:**
- Verify only; do not add a test harness for this narrow interaction and content update.

**Interfaces:**
- Consumes: completed Tasks 1 and 2
- Produces: a verified local release candidate awaiting Aaron's visual approval

- [x] **Step 1: Run static and unit checks**

Run `npm run test:unit` and `npm run build`. Restore `next-env.d.ts` if Next.js rewrites its generated route reference during the build.

- [x] **Step 2: Review release scope**

Run `git diff --check`, inspect `git diff --stat`, and confirm the dependency/configuration files remain unstaged.

- [x] **Step 3: Hand visual review to Aaron**

Ask Aaron to choose either `Looks good to me, keep going` or `Verify via automation`. Do not manage a server.

- [ ] **Step 4: Commit and deploy after approval**

Stage only the spec/plan, `lib/portfolio.ts`, `PortfolioMedia.tsx`, and the five Aaron's Toolbox image files. Commit on `main`, push `main`, monitor the Netlify deployment, and verify the production route and new Distributor asset return HTTP 200.
