export const MOBILE_SECTION_CONTENT_PADDING_LEFT =
  'calc(env(safe-area-inset-left, 0px) + var(--portfolio-navigation-track-size))'

export const MOBILE_SECTION_CONTENT_PADDING_RIGHT =
  'calc(env(safe-area-inset-right, 0px) + var(--portfolio-stacked-content-right-inset))'

export const MOBILE_SECTION_CONTENT_CENTER =
  `calc((100% + ${MOBILE_SECTION_CONTENT_PADDING_LEFT} - ${MOBILE_SECTION_CONTENT_PADDING_RIGHT}) / 2)`
