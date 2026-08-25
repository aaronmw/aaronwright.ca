'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './caseStudyIntake.module.css';

const STORAGE_KEY = 'aaron-case-study-interview-v1';

type Question = {
  id: string;
  label: string;
  prompt: string;
  placeholder?: string;
  kind?: 'short' | 'long';
};

type Study = 'freshbooks' | 'loopio';
type Answers = Record<string, string>;
type OwnershipLevel = 'originated' | 'led' | 'co-designed' | 'contributed' | 'supported' | 'not-sure' | 'not-applicable' | '';
type OwnershipAnswer = {
  items: Record<string, { level: OwnershipLevel; note: string }>;
  context: string;
};
type AssetRights = 'public' | 'redact' | 'reference-only' | 'unknown';
type AssetRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  addedAt: string;
  title: string;
  kind: string;
  claim: string;
  attribution: string;
  rights: AssetRights;
  notes: string;
};
type TimelineAnchorId = 'aaron-joined' | 'thomas-joined' | 'thomas-left' | 'aaron-left';
type TimelineEvent = {
  id: string;
  label: string;
  relativeTo: TimelineAnchorId;
  offsetMonths: number;
  certainty: 'rough' | 'fairly-sure';
  notes: string;
};
type TimelineAnswer = {
  anchors: Record<TimelineAnchorId, string>;
  events: TimelineEvent[];
  context: string;
};

const timelineAnchors: Array<{ id: TimelineAnchorId; label: string }> = [
  { id: 'aaron-joined', label: 'You joined Loopio' },
  { id: 'thomas-joined', label: 'Thomas joined' },
  { id: 'thomas-left', label: 'Thomas left' },
  { id: 'aaron-left', label: 'You left Loopio' },
];

const initialTimelineEvents = [
  'Prototype work began',
  'First internal demo',
  'First customer or prospect validation',
  'Prototype was mainlined',
  'Your role or title changed',
  'Design-system rollout began',
];

const ASSET_DB = 'aaron-case-study-assets-v1';
const ASSET_STORE = 'images';

function openAssetDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(ASSET_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(ASSET_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeAssetImage(id: string, file: File) {
  const db = await openAssetDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, 'readwrite');
    transaction.objectStore(ASSET_STORE).put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function getAssetImage(id: string) {
  const db = await openAssetDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(ASSET_STORE).objectStore(ASSET_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

async function deleteAssetImage(id: string) {
  const db = await openAssetDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, 'readwrite');
    transaction.objectStore(ASSET_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function clearAssetImages() {
  const db = await openAssetDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, 'readwrite');
    transaction.objectStore(ASSET_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

const freshBooksOwnershipContributions = [
  { id: 'card-list-modes', label: 'Card and list modes' },
  { id: 'wysiwyg-creation', label: 'WYSIWYG creation experiences' },
  { id: 'metadata-pane', label: 'Metadata side pane' },
  { id: 'information-architecture', label: 'Entity-oriented information architecture' },
  { id: 'colour-customization', label: 'Invoice customization replacing app colour themes' },
  { id: 'progressive-disclosure', label: 'Progressive disclosure patterns' },
  { id: 'two-way-migration', label: 'Two-way migration between old and new products' },
  { id: 'transition-research', label: 'Customer transition research' },
  { id: 'design-system', label: 'Design-system documentation' },
  { id: 'ember-components', label: 'Ember component implementation' },
  { id: 'internal-education', label: 'Internal education and onboarding' },
] as const;

const loopioOwnershipContributions = [
  { id: 'redesign-concept', label: 'Ground-up redesign concept' },
  { id: 'project-sidebar', label: 'Project sidebar and mode structure' },
  { id: 'outline-view', label: 'Bulk-editable document outline' },
  { id: 'timeline-view', label: 'RFP timeline and milestones' },
  { id: 'resource-view', label: 'Assets and resources view' },
  { id: 'visual-language', label: 'Colour, type, and interaction language' },
  { id: 'figma-library', label: 'Shared Figma component library' },
  { id: 'react-components', label: 'Production React component library' },
  { id: 'documentation', label: 'Component and composition documentation' },
  { id: 'accessibility-mobile', label: 'Accessibility and mobile guidance' },
  { id: 'internal-selling', label: 'Internal advocacy and stakeholder buy-in' },
  { id: 'adoption', label: 'Design-system rollout and adoption' },
] as const;

function ownershipContributionsFor(study: Study) {
  return study === 'freshbooks' ? freshBooksOwnershipContributions : loopioOwnershipContributions;
}

const ownershipLevels: Array<{ value: OwnershipLevel; label: string }> = [
  { value: '', label: 'Choose involvement…' },
  { value: 'originated', label: 'Originated' },
  { value: 'led', label: 'Led' },
  { value: 'co-designed', label: 'Co-designed' },
  { value: 'contributed', label: 'Contributed' },
  { value: 'supported', label: 'Supported' },
  { value: 'not-sure', label: 'Not sure yet' },
  { value: 'not-applicable', label: 'Not applicable' },
];

const studies: Array<{ id: Study; name: string; era: string }> = [
  { id: 'freshbooks', name: 'FreshBooks', era: 'Earlier chapter' },
  { id: 'loopio', name: 'Loopio', era: 'Later chapter' },
];

const sharedQuestions: Question[] = [
  {
    id: 'shared.audience',
    label: 'Audience',
    prompt: 'Who should these case studies persuade, and what role are you hoping they picture you doing?',
    placeholder: 'Hiring managers for… They should leave believing…',
  },
  {
    id: 'shared.throughline',
    label: 'Throughline',
    prompt: 'What do FreshBooks and Loopio reveal together that neither story proves alone?',
    placeholder: 'Across both stories, I consistently…',
  },
  {
    id: 'shared.voice',
    label: 'Voice',
    prompt: 'How should the finished stories sound: reflective, punchy, technical, candid, leadership-focused, or something else?',
    placeholder: 'Candid and specific, with…',
  },
  {
    id: 'shared.contrast',
    label: 'Evolution between stories',
    prompt: 'FreshBooks and Loopio share a pattern. What did you deliberately do differently at Loopio because of what FreshBooks taught you—and where did you repeat an old mistake anyway?',
    placeholder: 'At FreshBooks I learned… At Loopio that changed how I… I still repeated…',
  },
];

const studyQuestions: Question[] = [
  {
    id: 'snapshot',
    label: 'One-minute version',
    prompt: 'Tell the whole story badly and quickly. What happened, what did you do, and why did it matter?',
    placeholder: 'We needed to… I stepped in to… The result was…',
  },
  {
    id: 'setting',
    label: 'Setting',
    prompt: 'When was this, what was the company and product context, and what was changing around you?',
    placeholder: 'Approximate dates, company stage, team changes, product moment…',
  },
  {
    id: 'problem',
    label: 'Problem',
    prompt: 'What was broken, missing, risky, slow, confusing, or newly possible?',
    placeholder: 'The visible symptom was… The deeper problem was…',
  },
  {
    id: 'stakes',
    label: 'Stakes',
    prompt: 'Who felt the problem, and what would happen if nobody solved it?',
    placeholder: 'For customers… For the team… For the business…',
  },
  {
    id: 'role',
    label: 'Your mandate',
    prompt: 'What were you formally responsible for—and what did you choose to take ownership of beyond that?',
    placeholder: 'My title was… I was asked to… I additionally…',
  },
  {
    id: 'collaborators',
    label: 'People',
    prompt: 'Who shaped the work with you? Name roles, important partnerships, decision-makers, and skeptics.',
    placeholder: 'I partnered most closely with… The decision sat with…',
  },
  {
    id: 'evidence',
    label: 'Evidence',
    prompt: 'How did you know this was the right problem? What research, data, support signals, observation, or lived experience informed you?',
    placeholder: 'We saw… We heard… I observed…',
  },
  {
    id: 'constraints',
    label: 'Constraints',
    prompt: 'What made the obvious solution impossible or incomplete?',
    placeholder: 'Time, technology, organizational dynamics, legacy systems, staffing…',
  },
  {
    id: 'options',
    label: 'Options considered',
    prompt: 'What credible alternatives did you consider, and why did you reject or defer them?',
    placeholder: 'We could have… Instead we chose… because…',
  },
  {
    id: 'decision',
    label: 'Key decision',
    prompt: 'What was the most consequential judgment call you personally made?',
    placeholder: 'The turning point was deciding to…',
  },
  {
    id: 'process',
    label: 'How the work unfolded',
    prompt: 'Walk through the meaningful phases. Where did you explore, align, prototype, build, test, or change course?',
    placeholder: 'First… Then… We learned… So I changed…',
  },
  {
    id: 'tension',
    label: 'Hard moment',
    prompt: 'Where did the project become uncertain, politically difficult, technically messy, or nearly fail?',
    placeholder: 'The uncomfortable part was… I handled it by…',
  },
  {
    id: 'craft',
    label: 'Craft details',
    prompt: 'Which design or implementation details best demonstrate your taste and depth?',
    placeholder: 'Interaction details, system choices, prototypes, code, facilitation techniques…',
  },
  {
    id: 'leadership',
    label: 'Leadership',
    prompt: 'How did you improve other people’s work, clarity, confidence, or ability to move?',
    placeholder: 'I created alignment by… I enabled the team to…',
  },
  {
    id: 'outcomes',
    label: 'Outcomes',
    prompt: 'What changed because of the work? Include measurable results, observed behavior, adoption, speed, quality, or organizational effects.',
    placeholder: 'Numbers if remembered; otherwise specific observable changes…',
  },
  {
    id: 'proof',
    label: 'Proof available',
    prompt: 'What artifacts could support the story—screens, decks, prototypes, code, research, quotes, metrics, or people who can corroborate it?',
    placeholder: 'File names, URLs, folders, screenshots, names, approximate locations…',
  },
  {
    id: 'hindsight',
    label: 'Hindsight',
    prompt: 'What would you do differently now, and what does that reveal about how you have grown?',
    placeholder: 'At the time I… Now I would… because…',
  },
  {
    id: 'headline',
    label: 'Possible headline',
    prompt: 'Finish this sentence: “This is a story about…”',
    placeholder: '…turning a fragmented UI into a shared way of working.',
    kind: 'short',
  },
];

const freshBooksFollowUps: Question[] = [
  {
    id: 'followup.central_project',
    label: 'Choose the spine',
    prompt: 'If this case study could have only one central project, what would it be—and how do the other accomplishments support that story?',
    placeholder: 'The central story is… The redesign, migration, and system work connect because…',
  },
  {
    id: 'followup.ownership',
    label: 'Map your ownership',
    prompt: 'For each major contribution, classify your involvement as originated, led, co-designed, contributed, or supported.',
    placeholder: 'Card/list modes — originated\nMetadata pane — led\nTwo-way migration — co-designed\nDesign system documentation — …',
  },
  {
    id: 'followup.transition_decisions',
    label: 'Research to decision',
    prompt: 'What concrete product or rollout decisions changed because of your customer transition research?',
    placeholder: 'Approximate participant count; changes to forced migration, switching, eligibility, parity, sequencing, or messaging…',
  },
  {
    id: 'followup.meta_pane',
    label: 'Metadata pane example',
    prompt: 'Using one representative workflow, describe the experience before and after the metadata pane—and what testing revealed.',
    placeholder: 'Before, scheduling a payment reminder meant… With the pane… Users then… The pattern spread to…',
  },
  {
    id: 'followup.card_list_validation',
    label: 'Card/list validation',
    prompt: 'Was switching between card and list views shipped, and did users actually graduate between them—or did this remain an unproven design hypothesis?',
    placeholder: 'What shipped, what was observed, and what remained an intention…',
  },
  {
    id: 'followup.system_effect',
    label: 'System effect',
    prompt: 'What did “building like LEGO” measurably or observably change for designers and engineers?',
    placeholder: 'Adoption, shipping speed, fewer inconsistencies, less repeated debate, or one project that became noticeably easier…',
  },
  {
    id: 'followup.business_evidence',
    label: 'Business evidence',
    prompt: 'What evidence supported the belief that the aging product threatened competitiveness or premium positioning?',
    placeholder: 'Sales objections, conversion concerns, customer quotes, churn reasons, competitive research, leadership goals—or note that this was a strategic judgment…',
  },
  {
    id: 'followup.separate_company',
    label: 'Separate-company experiment',
    prompt: 'What was the separate-company experiment, what happened, and how—if at all—did it affect FreshBooks or your work?',
    placeholder: 'It was called… Customers believed… We learned… My involvement was…',
  },
  {
    id: 'followup.argument',
    label: 'A productive disagreement',
    prompt: 'Describe one specific moment when others wanted simplicity through removal and you argued for progressive disclosure instead.',
    placeholder: 'The team proposed… I was concerned that… I advocated for… The resulting design…',
  },
  {
    id: 'followup.toyish',
    label: 'Define “toyish”',
    prompt: 'Which concrete decisions made the finished product feel toy-like, and was that customer language or your interpretation in hindsight?',
    placeholder: 'Information density, cards, missing bulk actions, metaphors, novice-first simplification…',
  },
  {
    id: 'followup.after_launch',
    label: 'After launch',
    prompt: 'What happened after launch, and which parts of this work endured?',
    placeholder: 'General availability, coexistence, migration, eventual replacement, and patterns still visible after you left…',
  },
  {
    id: 'followup.artifact_rights',
    label: 'Asset inventory',
    prompt: 'Collect the visual evidence that could support this story and document what each asset proves.',
  },
];

const loopioFollowUps: Question[] = [
  {
    id: 'followup.central_project',
    label: 'Choose the spine',
    prompt: 'Is the central Loopio story the product redesign, the design system that made it buildable, or your work turning an unofficial prototype into an organizational capability?',
    placeholder: 'The case should lead with… The other two matter because…',
  },
  {
    id: 'followup.timeline',
    label: 'Reconstruct the timeline',
    prompt: 'Anchor the story with approximate dates and transitions: joining, beginning the prototype, first internal and customer demos, mainlining it, Thomas leaving, your title change, and your departure.',
    placeholder: 'Even rough quarters or “about X months later” are useful…',
  },
  {
    id: 'followup.ownership',
    label: 'Map your ownership',
    prompt: 'For each major Loopio contribution, classify your involvement as originated, led, co-designed, contributed, or supported.',
  },
  {
    id: 'followup.prototype_to_product',
    label: 'Prototype to product',
    prompt: 'What exactly did “mainlined” mean? Describe the decision, the production scope, how the prototype related to the existing backend, and what shipped while you were there.',
    placeholder: 'Leadership approved… We integrated or rebuilt… Customers received… The remaining gap was…',
  },
  {
    id: 'followup.validation_decisions',
    label: 'Validation to decision',
    prompt: 'Who saw the prototype, what did you learn, and which concrete product, sales, roadmap, or rollout decisions changed because of that evidence?',
    placeholder: 'Approximate customer or prospect count; repeated reactions; a feature, priority, or sales motion that changed…',
  },
  {
    id: 'followup.resistance',
    label: 'The consequential objection',
    prompt: 'What was the senior PM’s strongest substantive objection, how did you respond, and who ultimately decided whether the work would proceed?',
    placeholder: 'Their concern was… I agreed/disagreed because… We resolved—or failed to resolve—it by…',
  },
  {
    id: 'followup.component_case',
    label: 'One component in depth',
    prompt: 'Choose one high-instance or high-complexity component you personally took from problem to production. What variants, states, accessibility behavior, responsive behavior, and composition rules did it need?',
    placeholder: 'Before, teams had… I designed and built… The difficult states were… Teams then used it to…',
  },
  {
    id: 'followup.adoption',
    label: 'Adoption evidence',
    prompt: 'How did you get designers and engineers to use the system, and what observable evidence shows that adoption changed speed, consistency, accessibility, or collaboration?',
    placeholder: 'Teams or surfaces using it, component coverage, contribution process, fewer one-offs, faster delivery, critique changes…',
  },
  {
    id: 'followup.outcomes',
    label: 'Outcome ladder',
    prompt: 'Separate the outcomes you can directly prove from the ones you reasonably infer. What shipped, what behavior changed, what business signal appeared, and what remains visible today?',
    placeholder: 'Directly observed… Reported by Sales/customers… Inferred… Still visible…',
  },
  {
    id: 'followup.engagement_evidence',
    label: 'Engagement evidence',
    prompt: 'You remember better engagement in Projects and the Library after launch. How was that observed or reported, and what—if anything—do you remember about the size or direction of the change?',
    placeholder: 'Analytics dashboard, internal report, customer behavior, team observation, or “I remember the conclusion but not the source”…',
  },
  {
    id: 'followup.communication_repair',
    label: 'Repairing the rollout',
    prompt: 'You said early secrecy created friction for the rest of the rollout. What did that friction look like, and what did you personally do afterward to rebuild trust or invite ownership?',
    placeholder: 'People felt… It affected… I changed my approach by… The relationship or process then…',
  },
  {
    id: 'followup.artifact_rights',
    label: 'Asset inventory',
    prompt: 'Collect the visual evidence that could support this story and document what each asset proves.',
  },
];

function questionsForStudy(study: Study) {
  return study === 'freshbooks'
    ? [...studyQuestions, ...freshBooksFollowUps]
    : [...studyQuestions, ...loopioFollowUps];
}

function keyFor(study: Study, questionId: string) {
  return `${study}.${questionId}`;
}

function emptyOwnershipAnswer(study: Study): OwnershipAnswer {
  return {
    items: Object.fromEntries(
      ownershipContributionsFor(study).map((contribution) => [contribution.id, { level: '', note: '' }])
    ),
    context: '',
  };
}

function parseOwnershipAnswer(study: Study, value: string): OwnershipAnswer {
  const empty = emptyOwnershipAnswer(study);
  if (!value) return empty;

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return { ...empty, context: value };
    return {
      items: Object.fromEntries(
        ownershipContributionsFor(study).map((contribution) => {
          const item = parsed.items?.[contribution.id];
          return [contribution.id, {
            level: ownershipLevels.some((option) => option.value === item?.level) ? item.level : '',
            note: typeof item?.note === 'string' ? item.note : '',
          }];
        })
      ),
      context: typeof parsed.context === 'string' ? parsed.context : '',
    };
  } catch {
    return { ...empty, context: value };
  }
}

function parseAssetAnswer(value: string): AssetRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    const assets = Array.isArray(parsed) ? parsed : parsed?.assets;
    return Array.isArray(assets) ? assets : [];
  } catch {
    return [];
  }
}

function emptyTimelineAnswer(): TimelineAnswer {
  return {
    anchors: Object.fromEntries(timelineAnchors.map((anchor) => [anchor.id, ''])) as Record<TimelineAnchorId, string>,
    events: initialTimelineEvents.map((label, index) => ({
      id: `timeline-default-${index + 1}`,
      label,
      relativeTo: 'thomas-joined' as TimelineAnchorId,
      offsetMonths: 0,
      certainty: 'rough' as const,
      notes: '',
    })),
    context: '',
  };
}

function parseTimelineAnswer(value: string): TimelineAnswer {
  if (!value) return emptyTimelineAnswer();
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return { ...emptyTimelineAnswer(), context: value };
    const empty = emptyTimelineAnswer();
    return {
      anchors: Object.fromEntries(timelineAnchors.map((anchor) => [anchor.id, typeof parsed.anchors?.[anchor.id] === 'string' ? parsed.anchors[anchor.id] : ''])) as Record<TimelineAnchorId, string>,
      events: Array.isArray(parsed.events) ? parsed.events : empty.events,
      context: typeof parsed.context === 'string' ? parsed.context : '',
    };
  } catch {
    return { ...emptyTimelineAnswer(), context: value };
  }
}

function exportAnswer(study: Study, question: Question, value: string) {
  if (question.id === 'followup.ownership') return parseOwnershipAnswer(study, value);
  if (study === 'loopio' && question.id === 'followup.timeline') return parseTimelineAnswer(value);
  if (question.id === 'followup.artifact_rights') {
    return {
      assets: parseAssetAnswer(value),
      imagePayloadsIncluded: false,
      note: 'Images remain in the originating browser. Attach the referenced files separately.',
    };
  }
  return value;
}

function importAnswer(study: Study, question: Question, value: unknown) {
  if (question.id === 'followup.ownership') {
    return typeof value === 'string' ? value : JSON.stringify(value ?? emptyOwnershipAnswer(study));
  }
  if (question.id === 'followup.artifact_rights') {
    if (typeof value === 'string') return value;
    return JSON.stringify(Array.isArray(value) ? value : (value as { assets?: unknown[] } | undefined)?.assets ?? []);
  }
  if (study === 'loopio' && question.id === 'followup.timeline') {
    return typeof value === 'string' ? value : JSON.stringify(value ?? emptyTimelineAnswer());
  }
  return typeof value === 'string' ? value : '';
}

function isAnswerComplete(id: string, value: string) {
  if (id.endsWith('.followup.ownership')) {
    const study = id.startsWith('freshbooks.') ? 'freshbooks' : 'loopio';
    const ownership = parseOwnershipAnswer(study, value);
    return ownershipContributionsFor(study).every((contribution) => ownership.items[contribution.id]?.level);
  }
  if (id.endsWith('.followup.artifact_rights')) return parseAssetAnswer(value).length > 0;
  if (id === keyFor('loopio', 'followup.timeline')) {
    const timeline = parseTimelineAnswer(value);
    return timelineAnchors.every((anchor) => timeline.anchors[anchor.id]);
  }
  return Boolean(value.trim());
}

function buildExport(answers: Answers) {
  const caseStudies = Object.fromEntries(
    studies.map((study) => [
      study.id,
      {
        company: study.name,
        answers: Object.fromEntries(
          questionsForStudy(study.id).map((question) => [
            question.id,
            exportAnswer(study.id, question, answers[keyFor(study.id, question.id)] ?? ''),
          ])
        ),
      },
    ])
  );

  return {
    schema: 'aaron.case-study-interview.v1',
    exportedAt: new Date().toISOString(),
    shared: Object.fromEntries(
      sharedQuestions.map((question) => [question.id.replace('shared.', ''), answers[question.id] ?? ''])
    ),
    caseStudies,
  };
}

export function CaseStudyIntake() {
  const [answers, setAnswers] = useState<Answers>({});
  const [activeStudy, setActiveStudy] = useState<Study>('freshbooks');
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Saved locally');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {
      setStatus('Local save unavailable');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
      setStatus(`Saved locally · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    } catch {
      setStatus('Local save unavailable');
    }
  }, [answers, ready]);

  const allQuestionIds = useMemo(
    () => [
      ...sharedQuestions.map((question) => question.id),
      ...studies.flatMap((study) => questionsForStudy(study.id).map((question) => keyFor(study.id, question.id))),
    ],
    []
  );
  const answeredCount = allQuestionIds.filter((id) => isAnswerComplete(id, answers[id] ?? '')).length;
  const progress = Math.round((answeredCount / allQuestionIds.length) * 100);

  function updateAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(buildExport(answers), null, 2));
    setStatus('Copied JSON to clipboard');
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(buildExport(answers), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'case-study-interview.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Downloaded a backup');
  }

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported: Answers = {};
        for (const question of sharedQuestions) imported[question.id] = parsed.shared?.[question.id.replace('shared.', '')] ?? '';
        for (const study of studies) {
          for (const question of questionsForStudy(study.id)) {
            imported[keyFor(study.id, question.id)] = importAnswer(
              study.id,
              question,
              parsed.caseStudies?.[study.id]?.answers?.[question.id]
            );
          }
        }
        setAnswers(imported);
        setStatus('Imported backup');
      } catch {
        setStatus('That file is not a valid interview export');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function reset() {
    if (!window.confirm('Clear every answer from this browser? Download a backup first if you may need it.')) return;
    setAnswers({});
    window.localStorage.removeItem(STORAGE_KEY);
    void clearAssetImages().catch(() => {});
    setStatus('All answers cleared');
  }

  const active = studies.find((study) => study.id === activeStudy)!;
  const activeFollowUps = activeStudy === 'freshbooks' ? freshBooksFollowUps : loopioFollowUps;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Case study interview</p>
          <h1>Recover the story,<br />not just the screens.</h1>
          <p className={styles.intro}>Answer in fragments or full sentences. Everything saves to this browser as you type. When you’re done—or simply done for today—copy the JSON and paste it back into our task.</p>
        </div>
        <div className={styles.progressBlock} aria-label={`${progress}% complete`}>
          <span className={styles.progressNumber}>{progress}%</span>
          <span className={styles.progressLabel}>{answeredCount} of {allQuestionIds.length} prompts answered</span>
          <span className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></span>
          <span className={styles.saveStatus} aria-live="polite">{status}</span>
        </div>
      </header>

      <section className={styles.sharedSection} aria-labelledby="framing-title">
        <div className={styles.sectionLead}>
          <p className={styles.sectionIndex}>00</p>
          <div><h2 id="framing-title">Frame the collection</h2><p>Give both stories one shared destination.</p></div>
        </div>
        <div className={styles.questionList}>
          {sharedQuestions.map((question, index) => (
            <QuestionField key={question.id} question={question} number={index + 1} value={answers[question.id] ?? ''} onChange={(value) => updateAnswer(question.id, value)} />
          ))}
        </div>
      </section>

      <nav className={styles.studyTabs} aria-label="Case studies">
        {studies.map((study) => {
          const questions = questionsForStudy(study.id);
          const count = questions.filter((question) => {
            const id = keyFor(study.id, question.id);
            return isAnswerComplete(id, answers[id] ?? '');
          }).length;
          return (
            <button key={study.id} type="button" className={activeStudy === study.id ? styles.activeTab : ''} onClick={() => setActiveStudy(study.id)} aria-pressed={activeStudy === study.id}>
              <span>{study.name}</span><small>{count}/{questions.length}</small>
            </button>
          );
        })}
      </nav>

      <section className={styles.studySection} aria-labelledby="study-title">
        <aside className={styles.studyLead}>
          <p className={styles.sectionIndex}>{activeStudy === 'freshbooks' ? '01' : '02'}</p>
          <p className={styles.studyEra}>{active.era}</p>
          <h2 id="study-title">{active.name}</h2>
          <p>Specific beats polished. If you’re unsure, say so; uncertainty is useful evidence too.</p>
        </aside>
        <div className={styles.questionList}>
          {studyQuestions.map((question, index) => {
            const id = keyFor(activeStudy, question.id);
            return <QuestionField key={id} question={question} number={index + 1} value={answers[id] ?? ''} onChange={(value) => updateAnswer(id, value)} />;
          })}
          <div className={styles.followUpSection}>
            <div className={styles.followUpLead}>
              <p className={styles.eyebrow}>Story sharpening</p>
              <h3>Turn a rich history into a clear case.</h3>
              <p>{activeStudy === 'freshbooks'
                ? 'These follow-ups clarify your ownership, connect evidence to decisions, and separate what shipped from what was hypothesized.'
                : 'These follow-ups separate the redesign, system, and organizational story—then connect your contribution to evidence a reviewer can trust.'}</p>
            </div>
              {activeFollowUps.map((question, index) => {
                const id = keyFor(activeStudy, question.id);
                return question.id === 'followup.ownership' ? (
                  <OwnershipField
                    key={id}
                    number={studyQuestions.length + index + 1}
                    study={activeStudy}
                    value={answers[id] ?? ''}
                    onChange={(value) => updateAnswer(id, value)}
                  />
                ) : activeStudy === 'loopio' && question.id === 'followup.timeline' ? (
                  <TimelineField
                    key={id}
                    number={studyQuestions.length + index + 1}
                    value={answers[id] ?? ''}
                    onChange={(value) => updateAnswer(id, value)}
                  />
                ) : question.id === 'followup.artifact_rights' ? (
                  <AssetInventoryField
                    key={id}
                    number={studyQuestions.length + index + 1}
                    value={answers[id] ?? ''}
                    onChange={(value) => updateAnswer(id, value)}
                  />
                ) : (
                  <QuestionField key={id} question={question} number={studyQuestions.length + index + 1} value={answers[id] ?? ''} onChange={(value) => updateAnswer(id, value)} />
                );
              })}
          </div>
        </div>
      </section>

      <footer className={styles.actions}>
        <div><strong>Your browser is the draft.</strong><span>Download a backup if you switch devices or clear browser data.</span></div>
        <div className={styles.actionButtons}>
          <button type="button" className={styles.quietButton} onClick={() => importRef.current?.click()}>Import</button>
          <input ref={importRef} type="file" accept="application/json,.json" onChange={importJson} hidden />
          <button type="button" className={styles.quietButton} onClick={downloadJson}>Download backup</button>
          <button type="button" className={styles.primaryButton} onClick={copyJson}>Copy JSON for Codex</button>
          <button type="button" className={styles.dangerButton} onClick={reset}>Reset</button>
        </div>
      </footer>
    </main>
  );
}

function QuestionField({ question, number, value, onChange }: { question: Question; number: number; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.question}>
      <span className={styles.questionMeta}><span>{String(number).padStart(2, '0')}</span><strong>{question.label}</strong>{value.trim() && <em>Answered</em>}</span>
      <span className={styles.prompt}>{question.prompt}</span>
      <textarea className={question.kind === 'short' ? styles.shortAnswer : ''} value={value} onChange={(event) => onChange(event.target.value)} placeholder={question.placeholder} rows={question.kind === 'short' ? 2 : 5} />
    </label>
  );
}

function OwnershipField({ number, study, value, onChange }: { number: number; study: Study; value: string; onChange: (value: string) => void }) {
  const contributions = ownershipContributionsFor(study);
  const answer = parseOwnershipAnswer(study, value);
  const complete = contributions.every((contribution) => answer.items[contribution.id]?.level);

  function updateItem(id: string, patch: Partial<{ level: OwnershipLevel; note: string }>) {
    onChange(JSON.stringify({
      ...answer,
      items: {
        ...answer.items,
        [id]: { ...answer.items[id], ...patch },
      },
    }));
  }

  return (
    <fieldset className={`${styles.question} ${styles.ownershipQuestion}`}>
      <legend className={styles.visuallyHidden}>Map your ownership</legend>
      <span className={styles.questionMeta} aria-hidden="true">
        <span>{String(number).padStart(2, '0')}</span>
        <strong>Map your ownership</strong>
        {complete && <em>Answered</em>}
      </span>
      <span className={styles.prompt}>Classify your involvement in each major contribution.</span>
      <p className={styles.fieldHelp}>Choose the closest level for every row. Use the note only when the label needs qualification or shared credit.</p>
      <div className={styles.ownershipList}>
        <div className={styles.ownershipHeader} aria-hidden="true">
          <span>Contribution</span><span>Involvement</span><span>Optional nuance</span>
        </div>
        {contributions.map((contribution) => {
          const item = answer.items[contribution.id];
          return (
            <div className={styles.ownershipRow} key={contribution.id}>
              <label className={styles.contributionLabel} htmlFor={`ownership-${contribution.id}`}>{contribution.label}</label>
              <select
                id={`ownership-${contribution.id}`}
                value={item.level}
                onChange={(event) => updateItem(contribution.id, { level: event.target.value as OwnershipLevel })}
                aria-label={`${contribution.label}: involvement`}
              >
                {ownershipLevels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input
                type="text"
                value={item.note}
                onChange={(event) => updateItem(contribution.id, { note: event.target.value })}
                placeholder="Add context…"
                aria-label={`${contribution.label}: optional context`}
              />
            </div>
          );
        })}
      </div>
      <label className={styles.contextField}>
        <span>Anything missing or hard to classify?</span>
        <textarea
          value={answer.context}
          onChange={(event) => onChange(JSON.stringify({ ...answer, context: event.target.value }))}
          placeholder="Add another contribution, explain how ownership changed over time, or flag something to revisit…"
          rows={3}
        />
      </label>
    </fieldset>
  );
}

function monthIndex(value: string) {
  const [year, month] = value.split('-').map(Number);
  return year && month ? year * 12 + month - 1 : null;
}

function formatMonth(value: string) {
  if (!value) return 'Date needed';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-CA', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatOffset(offset: number) {
  if (offset === 0) return 'around the same time';
  const amount = Math.abs(offset);
  return `${amount} month${amount === 1 ? '' : 's'} ${offset < 0 ? 'before' : 'after'}`;
}

function TimelineField({ number, value, onChange }: { number: number; value: string; onChange: (value: string) => void }) {
  const answer = parseTimelineAnswer(value);
  const complete = timelineAnchors.every((anchor) => answer.anchors[anchor.id]);

  function commit(next: TimelineAnswer) {
    onChange(JSON.stringify(next));
  }

  function updateAnchor(id: TimelineAnchorId, date: string) {
    commit({ ...answer, anchors: { ...answer.anchors, [id]: date } });
  }

  function updateEvent(id: string, patch: Partial<TimelineEvent>) {
    commit({ ...answer, events: answer.events.map((event) => event.id === id ? { ...event, ...patch } : event) });
  }

  function addEvent() {
    commit({ ...answer, events: [...answer.events, { id: crypto.randomUUID(), label: '', relativeTo: 'thomas-joined', offsetMonths: 0, certainty: 'rough', notes: '' }] });
  }

  function removeEvent(id: string) {
    commit({ ...answer, events: answer.events.filter((event) => event.id !== id) });
  }

  const knownAnchorValues = timelineAnchors.map((anchor) => monthIndex(answer.anchors[anchor.id])).filter((date): date is number => date !== null);
  const fallbackStart = knownAnchorValues.length ? Math.min(...knownAnchorValues) : 0;
  const fallbackSpan = knownAnchorValues.length > 1 ? Math.max(...knownAnchorValues) - fallbackStart : 36;
  const anchorValues = timelineAnchors.map((anchor, index) => monthIndex(answer.anchors[anchor.id]) ?? fallbackStart + (fallbackSpan / 3) * index);
  const eventValues = answer.events.map((event) => {
    const anchorPosition = anchorValues[timelineAnchors.findIndex((anchor) => anchor.id === event.relativeTo)];
    return anchorPosition + event.offsetMonths;
  });
  const minimum = Math.min(...anchorValues, ...eventValues);
  const maximum = Math.max(...anchorValues, ...eventValues);
  const range = Math.max(maximum - minimum, 1);
  const positionPercent = (date: number) => Math.max(10, Math.min(90, ((date - minimum) / range) * 100));
  const position = (date: number) => `${positionPercent(date)}%`;
  const occupiedLanes: number[] = [];
  const eventLanes = eventValues.map((date) => {
    const horizontalPosition = positionPercent(date);
    const availableLane = occupiedLanes.findIndex((lastPosition) => Math.abs(lastPosition - horizontalPosition) >= 18);
    if (availableLane >= 0) {
      occupiedLanes[availableLane] = horizontalPosition;
      return availableLane;
    }
    occupiedLanes.push(horizontalPosition);
    return occupiedLanes.length - 1;
  });
  const timelineHeight = 12.5 + Math.max(0, occupiedLanes.length - 1) * 1.55;

  return (
    <fieldset className={`${styles.question} ${styles.timelineQuestion}`}>
      <legend className={styles.visuallyHidden}>Reconstruct the Loopio timeline</legend>
      <span className={styles.questionMeta} aria-hidden="true">
        <span>{String(number).padStart(2, '0')}</span>
        <strong>Reconstruct the timeline</strong>
        {complete && <em>Anchored</em>}
      </span>
      <span className={styles.prompt}>Start with the four dates LinkedIn can verify, then place everything else relative to them.</span>
      <p className={styles.fieldHelp}>Month-level precision is enough. The visual spacing updates from the dates you enter; milestone offsets are intentionally approximate.</p>

      <div className={styles.timelineAnchors}>
        {timelineAnchors.map((anchor) => (
          <label key={anchor.id}>
            <span>{anchor.label}</span>
            <input type="month" value={answer.anchors[anchor.id]} onChange={(event) => updateAnchor(anchor.id, event.target.value)} />
          </label>
        ))}
      </div>

      <div className={styles.timelinePlot} aria-label="Loopio chronology preview" style={{ height: `${timelineHeight}rem` }}>
        <div className={styles.timelineRail} />
        {timelineAnchors.map((anchor, index) => (
          <div className={styles.timelineAnchorMarker} key={anchor.id} style={{ left: position(anchorValues[index]) }}>
            <span className={styles.timelineDot} />
            <strong>{anchor.label}</strong>
            <small>{formatMonth(answer.anchors[anchor.id])}</small>
          </div>
        ))}
        {answer.events.map((event, index) => (
          <div className={styles.timelineEventMarker} key={event.id} data-align={positionPercent(eventValues[index]) > 72 ? 'right' : 'left'} style={{ left: position(eventValues[index]), top: `${8.25 + eventLanes[index] * 1.55}rem` }} title={`${event.label}: ${formatOffset(event.offsetMonths)} ${timelineAnchors.find((anchor) => anchor.id === event.relativeTo)?.label}`}>
            <span />
            <small>{event.label || 'Untitled milestone'}</small>
          </div>
        ))}
      </div>

      <div className={styles.timelineEventList}>
        {answer.events.map((event, index) => (
          <article className={styles.timelineEventRow} key={event.id}>
            <div className={styles.timelineEventHeading}>
              <span>Milestone {String(index + 1).padStart(2, '0')}</span>
              <button type="button" onClick={() => removeEvent(event.id)}>Remove</button>
            </div>
            <label className={styles.timelineEventName}><span>What happened?</span><input value={event.label} onChange={(change) => updateEvent(event.id, { label: change.target.value })} placeholder="Name this milestone…" /></label>
            <div className={styles.timelineRelativeFields}>
              <label><span>Place it relative to</span><select value={event.relativeTo} onChange={(change) => updateEvent(event.id, { relativeTo: change.target.value as TimelineAnchorId })}>{timelineAnchors.map((anchor) => <option key={anchor.id} value={anchor.id}>{anchor.label}</option>)}</select></label>
              <label><span>Confidence</span><select value={event.certainty} onChange={(change) => updateEvent(event.id, { certainty: change.target.value as TimelineEvent['certainty'] })}><option value="rough">Very rough</option><option value="fairly-sure">Fairly sure</option></select></label>
            </div>
            <label className={styles.timelineOffset}>
              <span><strong>{formatOffset(event.offsetMonths)}</strong> {timelineAnchors.find((anchor) => anchor.id === event.relativeTo)?.label.toLowerCase()}</span>
              <input type="range" min="-24" max="24" step="1" value={event.offsetMonths} onChange={(change) => updateEvent(event.id, { offsetMonths: Number(change.target.value) })} />
              <span className={styles.timelineRangeLabels}><small>2 years before</small><small>same time</small><small>2 years after</small></span>
            </label>
            <label><span>Optional context</span><textarea value={event.notes} onChange={(change) => updateEvent(event.id, { notes: change.target.value })} placeholder="What makes this placement plausible, or what are you still unsure about?" rows={2} /></label>
          </article>
        ))}
      </div>
      <button type="button" className={styles.addTimelineEvent} onClick={addEvent}>+ Add another milestone</button>
      <label className={styles.contextField}>
        <span>Chronology notes</span>
        <textarea value={answer.context} onChange={(event) => commit({ ...answer, context: event.target.value })} placeholder="Anything that applies to the timeline as a whole…" rows={3} />
      </label>
    </fieldset>
  );
}

function AssetInventoryField({ number, value, onChange }: { number: number; value: string; onChange: (value: string) => void }) {
  const assets = parseAssetAnswer(value);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    Promise.all(assets.map(async (asset) => {
      const blob = await getAssetImage(asset.id);
      if (!blob) return [asset.id, ''] as const;
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return [asset.id, url] as const;
    })).then((entries) => {
      if (active) setPreviews(Object.fromEntries(entries));
    }).catch(() => {});
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [value]);

  function commit(next: AssetRecord[]) {
    onChange(JSON.stringify(next));
  }

  async function addFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!images.length) return;
    const added = await Promise.all(images.map(async (file) => {
      const id = crypto.randomUUID();
      await storeAssetImage(id, file);
      return {
        id,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        addedAt: new Date().toISOString(),
        title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        kind: 'Product screenshot',
        claim: '',
        attribution: '',
        rights: 'unknown' as AssetRights,
        notes: '',
      };
    }));
    commit([...assets, ...added]);
  }

  function updateAsset(id: string, patch: Partial<AssetRecord>) {
    commit(assets.map((asset) => asset.id === id ? { ...asset, ...patch } : asset));
  }

  async function removeAsset(asset: AssetRecord) {
    if (!window.confirm(`Remove “${asset.title || asset.fileName}” from this inventory?`)) return;
    await deleteAssetImage(asset.id).catch(() => {});
    commit(assets.filter((item) => item.id !== asset.id));
  }

  return (
    <fieldset className={`${styles.question} ${styles.assetQuestion}`}>
      <legend className={styles.visuallyHidden}>Asset inventory</legend>
      <span className={styles.questionMeta} aria-hidden="true">
        <span>{String(number).padStart(2, '0')}</span>
        <strong>Asset inventory</strong>
        {assets.length > 0 && <em>{assets.length} added</em>}
      </span>
      <span className={styles.prompt}>Build a visual evidence library for this case study.</span>
      <p className={styles.fieldHelp}>Images stay in this browser for previews. JSON exports only their metadata, so attach the original files separately when you share the finished inventory.</p>
      <button
        type="button"
        className={`${styles.assetDropzone} ${dragging ? styles.assetDropzoneActive : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}
      >
        <strong>Drop screenshots or images here</strong>
        <span>or choose files · PNG, JPEG, GIF, WebP, SVG</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => { if (event.target.files) void addFiles(event.target.files); event.target.value = ''; }} />
      {assets.length > 0 && (
        <div className={styles.assetList}>
          {assets.map((asset, index) => (
            <article className={styles.assetRow} key={asset.id}>
              <div className={styles.assetPreview}>
                {previews[asset.id]
                  ? <img src={previews[asset.id]} alt="" />
                  : <span>Preview stored in another browser</span>}
              </div>
              <div className={styles.assetFields}>
                <div className={styles.assetIdentity}>
                  <span>Asset {String(index + 1).padStart(2, '0')}</span>
                  <small>{asset.fileName} · {(asset.size / 1024).toFixed(0)} KB</small>
                </div>
                <label><span>Working title</span><input value={asset.title} onChange={(event) => updateAsset(asset.id, { title: event.target.value })} placeholder="What should we call this?" /></label>
                <div className={styles.assetFieldPair}>
                  <label><span>Asset type</span><select value={asset.kind} onChange={(event) => updateAsset(asset.id, { kind: event.target.value })}><option>Product screenshot</option><option>Prototype</option><option>Presentation</option><option>Design-system artifact</option><option>Research artifact</option><option>Diagram</option><option>Other</option></select></label>
                  <label><span>Usage rights</span><select value={asset.rights} onChange={(event) => updateAsset(asset.id, { rights: event.target.value as AssetRights })}><option value="unknown">Unknown / review</option><option value="public">Safe to publish</option><option value="redact">Publish after redaction</option><option value="reference-only">Reference only</option></select></label>
                </div>
                <label><span>Claim supported</span><textarea value={asset.claim} onChange={(event) => updateAsset(asset.id, { claim: event.target.value })} placeholder="What does this image help prove?" rows={2} /></label>
                <label><span>Attribution</span><input value={asset.attribution} onChange={(event) => updateAsset(asset.id, { attribution: event.target.value })} placeholder="Whose work appears here, and what was yours?" /></label>
                <label><span>Notes and redactions</span><textarea value={asset.notes} onChange={(event) => updateAsset(asset.id, { notes: event.target.value })} placeholder="Context, sensitive details, crop ideas, or where it belongs in the story…" rows={3} /></label>
                <button type="button" className={styles.removeAssetButton} onClick={() => void removeAsset(asset)}>Remove asset</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </fieldset>
  );
}
