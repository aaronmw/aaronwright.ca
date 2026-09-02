import type { CopyEditorEntry } from '@/lib/copyEditor'
import styles from './CopyEditor.module.css'

export type CopyEditorBlock = {
  id: string
  entries: CopyEditorEntry[]
  media?: CopyEditorEntry['media']
}

function wordCount(value: string) {
  const words = value.trim().match(/\S+/g)
  return words?.length ?? 0
}

function ContentSizedTextarea({
  id,
  ariaLabel,
  value,
  className,
  onChange,
}: {
  id: string
  ariaLabel: string
  value: string
  className: string
  onChange: (value: string) => void
}) {
  return (
    <textarea
      aria-label={ariaLabel}
      className={className}
      id={id}
      value={value}
      rows={1}
      spellCheck
      onChange={event => onChange(event.target.value)}
    />
  )
}

function CopyEditorField({
  entry,
  value,
  onChange,
}: {
  entry: CopyEditorEntry
  value: string
  onChange: (id: string, value: string) => void
}) {
  const changed = value !== entry.value
  const controlId = `copy-editor-field-${entry.id.replace(/[^a-z0-9]+/gi, '-')}`

  return (
    <div className={styles.field}>
      <span className={styles.fieldHeader}>
        <span>
          <span className={styles.label}>{entry.label}</span>
          <span className={styles.path}>{entry.id}</span>
        </span>
        <span className={styles.count}>{wordCount(value)} words</span>
      </span>
      <div className={styles.versions}>
        <div className={styles.version}>
          <span className={styles.versionLabel}>Original</span>
          <div
            className={`${styles.original} ${entry.control === 'input' ? styles.originalInput : styles.originalTextarea}`}
          >
            {entry.value}
          </div>
        </div>
        <label
          className={styles.version}
          htmlFor={controlId}
        >
          <span className={styles.versionLabel}>Editable</span>
          {entry.control === 'input' ? (
            <input
              className={`${styles.input} ${changed ? styles.controlChanged : ''}`}
              id={controlId}
              type="text"
              value={value}
              spellCheck
              onChange={event => onChange(entry.id, event.target.value)}
            />
          ) : (
            <ContentSizedTextarea
              ariaLabel={entry.label}
              className={`${styles.textarea} ${changed ? styles.controlChanged : ''}`}
              id={controlId}
              value={value}
              onChange={nextValue => onChange(entry.id, nextValue)}
            />
          )}
          {changed ? (
            <span className={styles.changeNote}>Changed from app copy</span>
          ) : null}
        </label>
      </div>
    </div>
  )
}

function CopyEditorMedia({
  media,
  alt,
}: {
  media: NonNullable<CopyEditorEntry['media']>
  alt: string
}) {
  return (
    <figure className={styles.mediaFrame}>
      {media.type === 'video' ? (
        <video
          src={media.src}
          aria-label={alt}
          controls
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        // These are known local portfolio assets; a plain image keeps the
        // authoring-only editor compatible with every source format.
        // eslint-disable-next-line @next/next/no-img-element
        // react-doctor-disable-next-line react-doctor/nextjs-no-img-element
        <img
          src={media.src}
          alt={alt}
        />
      )}
    </figure>
  )
}

export function CopyEditorEntrySlides({
  group,
  blocks,
  values,
  getSectionId,
  onChange,
}: {
  group: string
  blocks: CopyEditorBlock[]
  values: Record<string, string>
  getSectionId: (group: string) => string
  onChange: (id: string, value: string) => void
}) {
  return (
    <section>
      {blocks.map((block, blockIndex) => {
        const mediaAltEntry = block.entries.find(entry =>
          entry.id.endsWith('.alt'),
        )
        const mediaAlt = mediaAltEntry
          ? (values[mediaAltEntry.id] ?? mediaAltEntry.value)
          : (block.media?.alt ?? '')

        return (
          <article
            className={`${styles.entry} ${!block.media ? styles.entryNoMedia : ''}`}
            data-copy-editor-section-start={
              blockIndex === 0 ? getSectionId(group) : undefined
            }
            data-copy-editor-slide
            id={blockIndex === 0 ? getSectionId(group) : undefined}
            key={block.id}
          >
            <header className={styles.entryHeader}>
              <h2 className={styles.entryGroup}>{group}</h2>
              <span className={styles.entryProgress}>
                {String(blockIndex + 1).padStart(2, '0')} /{' '}
                {String(blocks.length).padStart(2, '0')} ·{' '}
                {block.entries.length}{' '}
                {block.entries.length === 1 ? 'field' : 'fields'}
              </span>
            </header>
            <div className={styles.fieldStack}>
              {block.entries.map(entry => (
                <CopyEditorField
                  entry={entry}
                  key={entry.id}
                  value={values[entry.id] ?? ''}
                  onChange={onChange}
                />
              ))}
            </div>
            {block.media ? (
              <CopyEditorMedia
                media={block.media}
                alt={mediaAlt}
              />
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
