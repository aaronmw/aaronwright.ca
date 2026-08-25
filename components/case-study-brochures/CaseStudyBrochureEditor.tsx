'use client'

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import {
  BROCHURE_SCHEMA,
  initialBrochureDocument,
  type AssetStatus,
  type BrochureDocument,
  type BrochureSection,
  type BrochureStudy,
  type SectionStatus,
  type StudyId,
} from './brochureData'

const STORAGE_KEY = 'aaron-case-study-brochures-v1'
const studies: Array<{ id: StudyId; label: string }> = [
  { id: 'loopio', label: 'Loopio' },
  { id: 'freshbooks', label: 'FreshBooks' },
]

const sectionStatuses: Array<{ value: SectionStatus; label: string }> = [
  { value: 'outline', label: 'Outline' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'ready', label: 'Ready' },
]

const assetStatuses: Array<{ value: AssetStatus; label: string }> = [
  { value: 'needed', label: 'Needed' },
  { value: 'candidate', label: 'Candidate found' },
  { value: 'selected', label: 'Selected' },
  { value: 'unavailable', label: 'Unavailable' },
]

const controlClass =
  'w-full min-h-11 border-0 bg-brief-field px-4 py-3 text-[0.95rem] leading-relaxed text-brief-ink shadow-[inset_0_0_0_1px_var(--color-brief-line)] outline-none transition-[background-color,box-shadow] duration-150 placeholder:text-brief-muted/70 hover:bg-brief-field-hover focus:bg-white focus:shadow-[inset_0_0_0_2px_var(--color-brief-signal)] motion-reduce:transition-none'

function cloneInitialDocument() {
  return structuredClone(initialBrochureDocument)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isBrochureSection(value: unknown): value is BrochureSection {
  if (!value || typeof value !== 'object') return false
  const section = value as Partial<BrochureSection>
  return (
    typeof section.id === 'string' &&
    typeof section.headline === 'string' &&
    typeof section.copyBudget === 'string' &&
    typeof section.claim === 'string' &&
    isStringArray(section.include) &&
    isStringArray(section.assetJobs) &&
    typeof section.interviewOnly === 'string' &&
    typeof section.draft === 'string' &&
    sectionStatuses.some(({ value: status }) => status === section.status)
  )
}

function isBrochureStudy(value: unknown): value is BrochureStudy {
  if (!value || typeof value !== 'object') return false
  const study = value as Partial<BrochureStudy>
  return (
    typeof study.company === 'string' &&
    typeof study.recommendedHeadline === 'string' &&
    isStringArray(study.alternateHeadlines) &&
    typeof study.standfirst === 'string' &&
    isStringArray(study.context) &&
    typeof study.narrativeSpine === 'string' &&
    Array.isArray(study.sections) &&
    study.sections.every(isBrochureSection) &&
    isStringArray(study.askMeAbout) &&
    isStringArray(study.leaveOff) &&
    Array.isArray(study.assets) &&
    study.assets.every(
      asset =>
        Boolean(asset) &&
        typeof asset === 'object' &&
        typeof asset.id === 'string' &&
        typeof asset.label === 'string' &&
        assetStatuses.some(({ value: status }) => status === asset.status) &&
        typeof asset.notes === 'string',
    ) &&
    isStringArray(study.factChecks)
  )
}

function isBrochureDocument(value: unknown): value is BrochureDocument {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<BrochureDocument>
  return (
    candidate.schema === BROCHURE_SCHEMA &&
    Boolean(candidate.collection) &&
    typeof candidate.collection?.throughline === 'string' &&
    Array.isArray(candidate.collection.recommendedOrder) &&
    candidate.collection.recommendedOrder.every(
      study => study === 'freshbooks' || study === 'loopio',
    ) &&
    typeof candidate.collection.notes === 'string' &&
    isBrochureStudy(candidate.studies?.freshbooks) &&
    isBrochureStudy(candidate.studies?.loopio)
  )
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

function upperBudget(value: string) {
  const matches = value.match(/\d+/g)
  return matches?.length ? Number(matches[matches.length - 1]) : 0
}

function exportedDocument(document: BrochureDocument) {
  return { ...document, exportedAt: new Date().toISOString() }
}

export function CaseStudyBrochureEditor() {
  const [document, setDocument] =
    useState<BrochureDocument>(cloneInitialDocument)
  const [activeStudy, setActiveStudy] = useState<StudyId>('loopio')
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Loading local draft…')
  const [copying, setCopying] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (isBrochureDocument(parsed)) setDocument(parsed)
      }
      setStatus('Saved locally')
    } catch {
      setStatus('Local save unavailable')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    setStatus('Saving…')
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document))
        setStatus(
          `Saved locally · ${new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}`,
        )
      } catch {
        setStatus('Local save unavailable')
      }
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [document, ready])

  const active = document.studies[activeStudy]
  const allSections = studies.flatMap(({ id }) => document.studies[id].sections)
  const draftedSections = allSections.filter(section =>
    section.draft.trim(),
  ).length
  const readySections = allSections.filter(
    section => section.status === 'ready',
  ).length
  const selectedAssets = studies.reduce(
    (total, { id }) =>
      total +
      document.studies[id].assets.filter(item => item.status === 'selected')
        .length,
    0,
  )

  function updateCollection(patch: Partial<BrochureDocument['collection']>) {
    setDocument(current => ({
      ...current,
      collection: { ...current.collection, ...patch },
    }))
  }

  function updateStudy(patch: Partial<BrochureStudy>) {
    setDocument(current => ({
      ...current,
      studies: {
        ...current.studies,
        [activeStudy]: { ...current.studies[activeStudy], ...patch },
      },
    }))
  }

  function updateSection(sectionId: string, patch: Partial<BrochureSection>) {
    setDocument(current => ({
      ...current,
      studies: {
        ...current.studies,
        [activeStudy]: {
          ...current.studies[activeStudy],
          sections: current.studies[activeStudy].sections.map(section =>
            section.id === sectionId ? { ...section, ...patch } : section,
          ),
        },
      },
    }))
  }

  async function copyJson() {
    if (copying) return
    setCopying(true)
    setStatus('Copying JSON…')
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(exportedDocument(document), null, 2),
      )
      setStatus('Copied JSON for Codex')
    } catch {
      setStatus('Clipboard access unavailable · use Download JSON')
    } finally {
      setCopying(false)
    }
  }

  function downloadJson() {
    const blob = new Blob(
      [JSON.stringify(exportedDocument(document), null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = 'case-study-brochures.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus('Downloaded JSON backup')
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result))
        if (!isBrochureDocument(parsed)) throw new Error('Unsupported schema')
        setDocument(parsed)
        setStatus('Imported brochure draft')
      } catch {
        setStatus('That file is not a valid brochure export')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function reset() {
    if (
      !window.confirm(
        'Reset both brochure drafts to the original outlines? Download the JSON first if you may need these edits.',
      )
    ) {
      return
    }
    const initial = cloneInitialDocument()
    setDocument(initial)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    setStatus('Reset to original outlines')
  }

  return (
    <main className="min-h-dvh bg-brief-paper pb-32 font-brief text-brief-ink antialiased">
      <header className="mx-auto grid max-w-[86rem] gap-10 px-6 pb-16 pt-10 sm:px-10 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-16 lg:pb-24">
        <div>
          <a
            href="/case-study-intake"
            className="mb-8 inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.1em] text-brief-muted underline decoration-brief-line underline-offset-4 outline-none hover:text-brief-signal focus-visible:ring-2 focus-visible:ring-brief-signal"
          >
            ← Interview questionnaire
          </a>
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.1em] text-brief-signal">
            Case-study brochure editor
          </p>
          <h1 className="max-w-[11ch] text-[clamp(3rem,8vw,7.5rem)] font-black leading-[0.86] tracking-[-0.075em]">
            Shape the pitch. Save the depth.
          </h1>
          <p className="mt-8 max-w-[42rem] text-[clamp(1rem,1.6vw,1.25rem)] leading-relaxed text-brief-muted">
            Draft the concise story here. Claims, asset jobs, and interview
            material stay close enough to guide you without crowding the page
            you’ll eventually publish.
          </p>
        </div>
        <div className="self-end border-t border-brief-line pt-5">
          <strong className="block text-5xl font-black tracking-[-0.06em]">
            {draftedSections}/{allSections.length}
          </strong>
          <span className="mt-2 block font-mono text-xs font-bold uppercase tracking-[0.08em] text-brief-muted">
            Sections drafted
          </span>
          <dl className="mt-6 grid grid-cols-2 gap-px bg-brief-line">
            <div className="bg-brief-paper p-3 pl-0">
              <dt className="text-xs text-brief-muted">Ready</dt>
              <dd className="mt-1 text-xl font-black">{readySections}</dd>
            </div>
            <div className="bg-brief-paper p-3">
              <dt className="text-xs text-brief-muted">Assets selected</dt>
              <dd className="mt-1 text-xl font-black">{selectedAssets}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="mx-auto max-w-[86rem] border-t border-brief-line px-6 py-8 sm:px-10 lg:px-16">
        <details>
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 font-bold outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-brief-signal">
            <span>Collection framing</span>
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-brief-muted">
              Shared across both stories
            </span>
          </summary>
          <div className="grid gap-6 pb-8 pt-5 lg:grid-cols-2">
            <TextArea
              label="Portfolio throughline"
              value={document.collection.throughline}
              onChange={value => updateCollection({ throughline: value })}
              rows={5}
            />
            <TextArea
              label="Collection notes"
              value={document.collection.notes}
              onChange={value => updateCollection({ notes: value })}
              placeholder="Ideas that apply to both brochures…"
              rows={5}
            />
          </div>
        </details>
      </section>

      <nav
        className="sticky top-0 z-20 mx-auto grid max-w-[86rem] grid-cols-2 border-b border-brief-line bg-brief-paper/95 px-6 backdrop-blur-xl sm:px-10 lg:px-16"
        aria-label="Case studies"
      >
        {studies.map(({ id, label }) => {
          const study = document.studies[id]
          const drafted = study.sections.filter(section =>
            section.draft.trim(),
          ).length
          return (
            <button
              key={id}
              type="button"
              className={`flex min-h-16 items-center justify-between border-x-0 border-b-0 border-t-[3px] px-4 text-left text-lg font-black outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brief-signal motion-reduce:transition-none ${
                activeStudy === id
                  ? 'border-brief-signal bg-brief-field text-brief-ink'
                  : 'border-transparent bg-transparent text-brief-muted hover:bg-brief-field/70 hover:text-brief-ink'
              }`}
              onClick={() => setActiveStudy(id)}
              aria-pressed={activeStudy === id}
            >
              <span>{label}</span>
              <small className="font-mono text-xs">
                {drafted}/{study.sections.length}
              </small>
            </button>
          )
        })}
      </nav>

      <section className="mx-auto grid max-w-[86rem] gap-10 px-6 pb-8 pt-12 sm:px-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20 lg:px-16">
        <aside>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-brief-signal">
            Positioning
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.055em]">
            {active.company}
          </h2>
          <p className="mt-5 leading-relaxed text-brief-muted">
            Start by making the promise precise. The sections beneath it should
            prove this—not introduce a different case.
          </p>
        </aside>
        <div className="grid min-w-0 gap-6">
          <TextField
            label="Recommended headline"
            value={active.recommendedHeadline}
            onChange={value => updateStudy({ recommendedHeadline: value })}
          />
          <StringListEditor
            label="Alternate headlines"
            values={active.alternateHeadlines}
            onChange={alternateHeadlines => updateStudy({ alternateHeadlines })}
            addLabel="Add headline"
          />
          <TextArea
            label="Standfirst"
            value={active.standfirst}
            onChange={value => updateStudy({ standfirst: value })}
            rows={4}
          />
          <TextArea
            label="Narrative spine"
            help="This is editorial guidance, not necessarily published copy."
            value={active.narrativeSpine}
            onChange={value => updateStudy({ narrativeSpine: value })}
            rows={5}
          />
          <StringListEditor
            label="Context strip"
            values={active.context}
            onChange={context => updateStudy({ context })}
            addLabel="Add context item"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[86rem] px-6 sm:px-10 lg:px-16">
        <div className="border-t-[3px] border-brief-ink pb-8 pt-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-brief-signal">
            Brochure sections
          </p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,4rem)] font-black leading-none tracking-[-0.055em]">
            Draft one claim at a time.
          </h2>
        </div>
        <div className="border-b border-brief-line">
          {active.sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              number={index + 1}
              section={section}
              onChange={patch => updateSection(section.id, patch)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[86rem] gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20 lg:px-16">
        <aside>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-brief-signal">
            Conversation hooks
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
            Leave room for the interview.
          </h2>
        </aside>
        <div className="grid gap-8">
          <StringListEditor
            label="Ask me about"
            help="Promising threads the brochure should open without exhausting."
            values={active.askMeAbout}
            onChange={askMeAbout => updateStudy({ askMeAbout })}
            addLabel="Add interview hook"
          />
          <StringListEditor
            label="Keep off the brochure"
            help="Useful context that is distracting, risky, or better discussed live."
            values={active.leaveOff}
            onChange={leaveOff => updateStudy({ leaveOff })}
            addLabel="Add excluded detail"
          />
          <StringListEditor
            label="Resolve before publishing"
            values={active.factChecks}
            onChange={factChecks => updateStudy({ factChecks })}
            addLabel="Add fact check"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-[86rem] gap-10 border-t-[3px] border-brief-ink px-6 py-16 sm:px-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20 lg:px-16">
        <aside>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-brief-signal">
            Asset shortlist
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">
            Give every image a job.
          </h2>
          <p className="mt-5 leading-relaxed text-brief-muted">
            Track selection here; use the interview questionnaire’s asset
            inventory for image previews, attribution, rights, and redaction
            notes.
          </p>
        </aside>
        <div className="bg-brief-line">
          {active.assets.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-4 border-b border-brief-line bg-brief-field p-4 last:border-b-0 sm:grid-cols-[2.5rem_minmax(12rem,1fr)_11rem_minmax(12rem,1fr)] sm:items-center"
            >
              <span className="font-mono text-xs font-bold text-brief-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <strong className="text-sm leading-snug">{item.label}</strong>
              <SelectField
                label={`${item.label}: status`}
                hideLabel
                value={item.status}
                options={assetStatuses}
                onChange={value =>
                  updateStudy({
                    assets: active.assets.map(assetItem =>
                      assetItem.id === item.id
                        ? { ...assetItem, status: value as AssetStatus }
                        : assetItem,
                    ),
                  })
                }
              />
              <TextField
                label={`${item.label}: notes`}
                hideLabel
                value={item.notes}
                placeholder="Filename, location, crop idea…"
                onChange={value =>
                  updateStudy({
                    assets: active.assets.map(assetItem =>
                      assetItem.id === item.id
                        ? { ...assetItem, notes: value }
                        : assetItem,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-brief-line bg-brief-paper/95 px-4 py-3 shadow-[0_-1rem_2rem_rgb(25_25_23_/_0.08)] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-[86rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span
            className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-brief-muted"
            aria-live="polite"
          >
            {status}
          </span>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              tone="quiet"
              onClick={() => importRef.current?.click()}
            >
              Import JSON
            </ActionButton>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              onChange={importJson}
              hidden
            />
            <ActionButton
              tone="quiet"
              onClick={downloadJson}
            >
              Download JSON
            </ActionButton>
            <ActionButton
              tone="primary"
              pending={copying}
              onClick={() => void copyJson()}
            >
              Copy JSON for Codex
            </ActionButton>
            <ActionButton
              tone="danger"
              onClick={reset}
            >
              Reset
            </ActionButton>
          </div>
        </div>
      </footer>
    </main>
  )
}

function SectionEditor({
  number,
  section,
  onChange,
}: {
  number: number
  section: BrochureSection
  onChange: (patch: Partial<BrochureSection>) => void
}) {
  const words = wordCount(section.draft)
  const budget = upperBudget(section.copyBudget)
  const overBudget = budget > 0 && words > budget

  return (
    <article className="grid gap-6 border-t border-brief-line py-8 first:border-t-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20 lg:py-12">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase tracking-[0.08em] text-brief-muted">
          <span>{String(number).padStart(2, '0')}</span>
          <span>{section.copyBudget}</span>
        </div>
        <TextField
          label={`Section ${number} headline`}
          hideLabel
          value={section.headline}
          onChange={value => onChange({ headline: value })}
          className="mt-4 text-lg font-black"
        />
        <div className="mt-4">
          <SelectField
            label={`Section ${number} status`}
            hideLabel
            value={section.status}
            options={sectionStatuses}
            onChange={value => onChange({ status: value as SectionStatus })}
          />
        </div>
      </div>
      <div className="min-w-0">
        <label className="grid gap-2">
          <span className="flex items-center justify-between gap-4 text-sm font-bold">
            <span>Published draft</span>
            <span
              className={overBudget ? 'text-brief-signal' : 'text-brief-muted'}
            >
              {words} words
            </span>
          </span>
          <textarea
            className={`${controlClass} min-h-56 resize-y text-base`}
            value={section.draft}
            onChange={event => onChange({ draft: event.target.value })}
            placeholder="Write only what a skimming reviewer needs to understand this part of the story…"
            rows={9}
          />
        </label>
        <details className="mt-4 border-t border-brief-line pt-2">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-bold outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-brief-signal">
            <span>Outline guidance</span>
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-brief-muted">
              Claim · content · assets
            </span>
          </summary>
          <div className="grid gap-6 pb-4 pt-4">
            <TextArea
              label="Claim this section must establish"
              value={section.claim}
              onChange={value => onChange({ claim: value })}
              rows={3}
            />
            <StringListEditor
              label="Include"
              values={section.include}
              onChange={include => onChange({ include })}
              addLabel="Add content point"
            />
            <StringListEditor
              label="Asset jobs"
              values={section.assetJobs}
              onChange={assetJobs => onChange({ assetJobs })}
              addLabel="Add asset job"
            />
            <TextArea
              label="Keep for the interview"
              value={section.interviewOnly}
              onChange={value => onChange({ interviewOnly: value })}
              rows={3}
            />
          </div>
        </details>
      </div>
    </article>
  )
}

function FieldLabel({
  children,
  help,
}: {
  children: ReactNode
  help?: string
}) {
  return (
    <span className="flex flex-col gap-1 text-sm font-bold">
      <span>{children}</span>
      {help ? (
        <span className="text-xs font-normal leading-relaxed text-brief-muted">
          {help}
        </span>
      ) : null}
    </span>
  )
}

function TextField({
  label,
  help,
  value,
  onChange,
  placeholder,
  hideLabel = false,
  className = '',
}: {
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hideLabel?: boolean
  className?: string
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className={hideLabel ? 'sr-only' : ''}>
        <FieldLabel help={help}>{label}</FieldLabel>
      </span>
      <input
        className={`${controlClass} ${className}`}
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

function TextArea({
  label,
  help,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <FieldLabel help={help}>{label}</FieldLabel>
      <textarea
        className={`${controlClass} resize-y`}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  hideLabel?: boolean
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className={hideLabel ? 'sr-only' : ''}>
        <FieldLabel>{label}</FieldLabel>
      </span>
      <select
        className={`${controlClass} py-2 pr-9 text-sm font-bold`}
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function StringListEditor({
  label,
  help,
  values,
  onChange,
  addLabel,
}: {
  label: string
  help?: string
  values: string[]
  onChange: (values: string[]) => void
  addLabel: string
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2">
        <FieldLabel help={help}>{label}</FieldLabel>
      </legend>
      <div className="grid gap-px bg-brief-line">
        {values.map((value, index) => (
          <div
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_3rem] items-stretch bg-brief-field"
            key={`${label}-${index}`}
          >
            <span className="grid place-items-center font-mono text-xs font-bold text-brief-muted">
              {String(index + 1).padStart(2, '0')}
            </span>
            <input
              className={`${controlClass} shadow-none focus:relative focus:z-10`}
              type="text"
              value={value}
              onChange={event =>
                onChange(
                  values.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item,
                  ),
                )
              }
              aria-label={`${label} ${index + 1}`}
            />
            <button
              type="button"
              className="min-h-11 bg-brief-field text-brief-muted outline-none hover:bg-white hover:text-brief-signal focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brief-signal"
              onClick={() =>
                onChange(values.filter((_, itemIndex) => itemIndex !== index))
              }
              aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-px min-h-11 w-full border border-dashed border-brief-muted bg-brief-field px-4 text-sm font-bold outline-none hover:border-brief-signal hover:bg-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brief-signal"
        onClick={() => onChange([...values, ''])}
      >
        + {addLabel}
      </button>
    </fieldset>
  )
}

function ActionButton({
  children,
  tone,
  pending = false,
  onClick,
}: {
  children: ReactNode
  tone: 'quiet' | 'primary' | 'danger'
  pending?: boolean
  onClick: () => void
}) {
  const toneClass = {
    quiet: 'bg-brief-field text-brief-ink hover:bg-white',
    primary: 'bg-brief-ink text-brief-paper hover:bg-brief-signal',
    danger: 'bg-transparent text-brief-muted hover:text-brief-signal',
  }[tone]
  return (
    <button
      type="button"
      className={`min-h-11 px-4 text-sm font-black outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brief-signal focus-visible:ring-offset-2 focus-visible:ring-offset-brief-paper motion-reduce:transition-none ${pending ? 'cursor-wait bg-brief-signal' : toneClass}`}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending || undefined}
      data-pending={pending}
    >
      {children}
    </button>
  )
}
