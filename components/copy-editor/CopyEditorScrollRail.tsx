import styles from './CopyEditorScrollRail.module.css'

export type CopyEditorSectionMarker = {
  id: string
  label: string
  slideIndex: number
}

export function CopyEditorScrollRail({
  activeSectionId,
  activeSlideIndex,
  onSelectSlide,
  sections,
  slideStarts,
}: {
  activeSectionId: string
  activeSlideIndex: number
  onSelectSlide: (slideIndex: number) => void
  sections: CopyEditorSectionMarker[]
  slideStarts: number[]
}) {
  const slideCount = slideStarts.length
  const activeSectionIndex = sections.findIndex(
    section => section.id === activeSectionId,
  )
  const activeSection = sections[activeSectionIndex]
  const nextSection = sections[activeSectionIndex + 1]
  const activeSectionStart = activeSection
    ? (slideStarts[activeSection.slideIndex] ?? 0)
    : (slideStarts[activeSlideIndex] ?? activeSlideIndex / slideCount)
  const activeSectionEnd = nextSection
    ? (slideStarts[nextSection.slideIndex] ?? 1)
    : 1

  return (
    <nav
      className={styles.rail}
      aria-label="Copy editor sections"
    >
      {slideStarts.map((start, slideIndex) => {
        const end = slideStarts[slideIndex + 1] ?? 1
        const section = sections.find(
          marker => marker.slideIndex === slideIndex,
        )
        const sectionActive = section?.id === activeSectionId

        return (
          <button
            className={styles.chunkTarget}
            type="button"
            key={slideIndex}
            style={{
              top: `${start * 100}%`,
              bottom: `${Math.max(0, 1 - end) * 100}%`,
            }}
            aria-label={
              section
                ? `Go to ${section.label}, screen ${slideIndex + 1} of ${slideCount}`
                : `Go to screen ${slideIndex + 1} of ${slideCount}`
            }
            aria-current={slideIndex === activeSlideIndex ? 'step' : undefined}
            onClick={() => onSelectSlide(slideIndex)}
          >
            {section ? (
              <span
                className={`${styles.sectionLabel} ${sectionActive ? styles.sectionLabelActive : ''}`}
              >
                {section.label}
              </span>
            ) : null}
          </button>
        )
      })}
      <span
        className={styles.track}
        aria-hidden="true"
      />
      {slideStarts.slice(1).map((start, index) => (
        <span
          className={styles.tick}
          key={index}
          style={{ top: `${start * 100}%` }}
          aria-hidden="true"
        />
      ))}
      <span
        className={styles.activeSection}
        style={{
          top: `${activeSectionStart * 100}%`,
          height: `${Math.max(0, activeSectionEnd - activeSectionStart) * 100}%`,
        }}
        aria-hidden="true"
      />
    </nav>
  )
}
