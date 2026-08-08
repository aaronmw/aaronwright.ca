# NextPhrase Video Restart Control

## Goal

Add an explicit restart control to the first NextPhrase portfolio slide without changing the existing inline enlargement or zoom interactions.

## Scope

- Mark only the NextPhrase intro video as restartable.
- Leave other portfolio images, animated PNGs, and future video slides unchanged unless they opt in.
- Preserve the current autoplay, muted, looping, clipping, and enlargement behavior.

## Interaction

- Show a centered 88px refresh icon button when a hover-capable pointer is over the media surface or when the button receives keyboard focus.
- A first click immediately sets the current video time to zero and resumes playback.
- Ignore the second click's restart action when its click detail is `2`; allow the resulting double-click event to bubble to the existing inline zoom handler.
- Do not add a persistent restart control on touch-only layouts because the video already loops and the requested reveal interaction is hover-based.

## Presentation

- Use the existing solid icon library's refresh icon.
- Style the control with a translucent white background and backdrop blur.
- Use 50% black for the resting icon and solid black on hover.
- Fade and scale the control in and out briefly; disable motion under reduced-motion preferences.
- Keep the button above the pointer-disabled media content so it can receive clicks without changing image dragging or panning behavior.

## Accessibility

- Render a native button with the accessible label and tooltip text `Restart animation`.
- Reveal the control on `focus-visible` as well as hover.
- Keep the existing double-click enlargement behavior intact.

## Verification

- Run the repository's unit tests and production build.
- Hand visual review to Aaron before browser automation, following the repository's visual-verification preference.
- Confirm manually that one click restarts playback and a double-click restarts once before entering zoom mode.
