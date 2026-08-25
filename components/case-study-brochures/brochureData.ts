export const BROCHURE_SCHEMA = 'aaron.case-study-brochures.v1' as const

export type StudyId = 'freshbooks' | 'loopio'
export type SectionStatus = 'outline' | 'drafting' | 'ready'
export type AssetStatus = 'needed' | 'candidate' | 'selected' | 'unavailable'

export type BrochureSection = {
  id: string
  headline: string
  copyBudget: string
  claim: string
  include: string[]
  assetJobs: string[]
  interviewOnly: string
  draft: string
  status: SectionStatus
}

export type BrochureAsset = {
  id: string
  label: string
  status: AssetStatus
  notes: string
}

export type BrochureStudy = {
  company: string
  recommendedHeadline: string
  alternateHeadlines: string[]
  standfirst: string
  context: string[]
  narrativeSpine: string
  sections: BrochureSection[]
  askMeAbout: string[]
  leaveOff: string[]
  assets: BrochureAsset[]
  factChecks: string[]
}

export type BrochureDocument = {
  schema: typeof BROCHURE_SCHEMA
  collection: {
    throughline: string
    recommendedOrder: StudyId[]
    notes: string
  }
  studies: Record<StudyId, BrochureStudy>
}

function section(
  id: string,
  headline: string,
  copyBudget: string,
  claim: string,
  include: string[],
  assetJobs: string[],
  interviewOnly = '',
): BrochureSection {
  return {
    id,
    headline,
    copyBudget,
    claim,
    include,
    assetJobs,
    interviewOnly,
    draft: '',
    status: 'outline',
  }
}

function asset(id: string, label: string): BrochureAsset {
  return { id, label, status: 'needed', notes: '' }
}

export const initialBrochureDocument: BrochureDocument = {
  schema: BROCHURE_SCHEMA,
  collection: {
    throughline:
      'Aaron learns complex products deeply, makes their underlying logic clearer, and turns that clarity into systems that improve both the customer experience and the way teams build.',
    recommendedOrder: ['loopio', 'freshbooks'],
    notes: '',
  },
  studies: {
    freshbooks: {
      company: 'FreshBooks',
      recommendedHeadline:
        'Making accounting approachable without pretending it was simple.',
      alternateHeadlines: [
        'Rebuilding FreshBooks around the way small businesses actually work.',
        'From a collection of accounting tools to a product teams could extend.',
      ],
      standfirst:
        'I helped reimagine FreshBooks as a coherent platform, then designed the interaction patterns, customer transition, and shared system that made the change usable for small-business owners and buildable by product teams.',
      context: [
        'Role: UX Designer; one of two designers selected for the initial redesign group',
        'Company: FreshBooks, approximately 100–250 people during my tenure',
        'Tenure: September 2012–July 2018',
        'Collaborators: Product and creative leadership, another product designer, senior product managers and engineers, Customer Support',
        'Scope: Core product redesign, migration research, interaction patterns, design-system foundations',
      ],
      narrativeSpine:
        'FreshBooks had grown from founder-built invoicing software into a collection of accounting tools. The redesign was an opportunity to turn years of accumulated product knowledge into a coherent system without forcing customers to relearn how to run their businesses.',
      sections: [
        section(
          'outgrown-foundations',
          'A product that had outgrown its foundations',
          '80–110 words',
          'The existing product still worked, but its visual language, navigation, technical architecture, and inconsistent patterns made every new feature harder to design, build, and sell confidently.',
          [
            'The multipage application looked and behaved like an earlier era of the web.',
            'Features had accumulated without a governing interaction system.',
            'User-controlled application colours made colour unreliable as a semantic cue.',
            'The design team repeatedly solved the same problems and compromised new work to fit the old product.',
          ],
          [
            'Representative legacy-product overview',
            'Example of inconsistent or scattered controls',
            'Optional themed screen obscuring a primary action',
          ],
          'Competitive positioning, premium-pricing concerns, and the full catalogue of legacy constraints.',
        ),
        section(
          'product-as-system',
          'Redesigning the product as a system',
          '100–130 words',
          'The redesign team established a coherent product model and principles that could guide decisions beyond individual screens.',
          [
            'A small cross-functional group explored divergent directions, prototyped, and tested weekly.',
            'Entity-oriented navigation remained the foundation while client pages supported client-first work.',
            'WYSIWYG creation made invoices and client records recognizable and approachable.',
            'Colour moved from application theming to customer-facing invoice branding, reclaiming product colour for meaning.',
          ],
          [
            'Guiding-principles or workshop artifact',
            'Information-architecture or early-direction artifact',
            'WYSIWYG client or invoice creation screen',
          ],
          'Detailed direction comparisons and weekly testing chronology.',
        ),
        section(
          'metadata-pane',
          'A place for complexity to live',
          '130–160 words',
          'Aaron originated the metadata pane to keep common creation flows focused while making advanced functionality consistent and discoverable.',
          [
            'Payment reminders, discounts, taxes, and other invoice features had been scattered around the interface.',
            'Advanced controls did not belong directly on a skeuomorphic invoice, but hiding them would make the product incomplete.',
            'The pane presented feature names and statuses in one predictable place.',
            'Selecting a feature moved the pane into a focused configuration view.',
            'The pattern gave future teams a repeatable way to extend an entity.',
          ],
          [
            'Creation screen showing the entity and metadata pane together',
            'Two-state sequence: feature index to focused configuration',
            'Optional annotation of status, navigation, and disclosure behavior',
          ],
          'Other progressive-disclosure arguments, card/list disagreement, and detailed testing observations.',
        ),
        section(
          'safe-change',
          'Letting customers choose when change was safe',
          '110–140 words',
          'Transition research changed migration from a launch event into a reversible customer decision.',
          [
            'Aaron led design research for the team moving customers between products.',
            'Dozens of personal interviews—and approximately 100 across the team—showed that timing mattered as much as usability.',
            'Customers needed the familiar product available when closing their books or encountering a missing workflow.',
            'The two-way switch reduced trial risk and informed feature parity and rollout eligibility.',
          ],
          [
            'Try-the-new-design entry point',
            'Switch-back control or reassurance messaging',
            'Parity, migration, eligibility, or research-planning artifact',
          ],
          'Interview planning, participant nuance, and the full migration mechanics.',
        ),
        section(
          'shared-system',
          'Helping teams build the same product',
          '100–130 words',
          'Aaron turned emerging product patterns into shared resources that improved the work of designers and engineers.',
          [
            'A comprehensive Sketch library spanning colours and type through complete page patterns.',
            'Documentation showed what patterns looked like and where they appeared in the live product.',
            'Prototypes and CodePens helped engineers implement or extend Ember components.',
            'Internal talks, onboarding, and formal design-system ownership spread the system.',
            'Teams recreated less and translated design intent more reliably.',
          ],
          [
            'Broad design-library overview',
            'Detailed component page with variants and guidance',
            'Implementation reference or documentation example',
          ],
          'Sketch techniques, contribution mechanics, internal talks, and individual adoption examples.',
        ),
        section(
          'endurance',
          'What endured—and what I would protect now',
          '90–120 words',
          'The platform and its interaction patterns endured, while its compromises reveal how Aaron’s product judgment matured.',
          [
            'The redesigned product reached general availability and eventually replaced the legacy experience.',
            'Cards, lists, entity creation, and side-pane disclosure remain visible today.',
            'The strongest hindsight lesson is protecting frequent and power users from novice-first inefficiency.',
            'Bulk workflows and denser modes should have received more deliberate advocacy.',
          ],
          [
            'Historical redesign paired with a current equivalent',
            'Present-day list, creation flow, or side-pane pattern showing continuity',
          ],
          '“Toyish” customer language, the full card/list debate, and Ember-versus-React hindsight.',
        ),
      ],
      askMeAbout: [
        'How research led to reversible migration instead of a forced launch',
        'Why progressive disclosure differs from removing necessary complexity',
        'What it took to turn a redesign into a system other teams could extend',
      ],
      leaveOff: [
        'The separate-company validation experiment unless directly asked',
        'A complete redesign chronology',
        'Names of every participant',
        'The full card-versus-list debate',
        '“Toyish” customer language; retain the underlying bulk-workflow lesson',
        'Speculation about competitive decline or revenue without data',
        'Detailed Ember-versus-React hindsight',
      ],
      assets: [
        asset('legacy-overview', 'Best legacy-product overview'),
        asset('redesign-overview', 'Best redesigned-product overview'),
        asset('wysiwyg-creation', 'WYSIWYG invoice or client creation'),
        asset('metadata-index', 'Metadata pane feature index'),
        asset('metadata-detail', 'Metadata pane focused configuration'),
        asset(
          'migration-controls',
          'New-product entry and switch-back controls',
        ),
        asset('design-system-overview', 'Sketch/design-system overview'),
        asset('component-docs', 'Detailed component or documentation page'),
        asset(
          'current-endurance',
          'Present-day screen demonstrating endurance',
        ),
      ],
      factChecks: [
        'Use “approximately” for transition-research participant counts unless a source confirms them.',
        'Describe current-product similarities as visual observation, not proof that the implementation is unchanged.',
      ],
    },
    loopio: {
      company: 'Loopio',
      recommendedHeadline:
        'Proving a better Loopio—then making it buildable by everyone else.',
      alternateHeadlines: [
        'Turning a two-person prototype into Loopio’s product foundation.',
        'From an unofficial redesign to a shared product platform.',
      ],
      standfirst:
        'I partnered with a senior frontend developer to reimagine Loopio’s core RFP workflow, helped build the momentum to replace its frontend, then stayed to turn our prototype into a tested, documented system that product teams could safely own and extend.',
      context: [
        'Roles: Principal Product Designer → Senior UX Engineer',
        'Aaron at Loopio: July 2018–January 2022',
        'Thomas at Loopio: August 2018–June 2020',
        'Core partnership: Aaron Wright and Thomas Cheng, followed by Product, Design, Engineering, Sales, and Customer Success',
        'Scope: Projects redesign, React frontend, Figma and production component systems, documentation, testing, adoption',
      ],
      narrativeSpine:
        'Two people made a more coherent product tangible; customer-facing teams turned that possibility into organizational momentum; and Aaron took responsibility for making the resulting frontend understandable, maintainable, and useful to the teams inheriting it.',
      sections: [
        section(
          'prototype-foundations',
          'A mature product still wearing its prototype',
          '80–110 words',
          'Loopio’s founder-built frontend and accumulated patterns limited product quality and the speed at which teams could respond to a growing market.',
          [
            'The product mixed jQuery, Backbone, React, Redux, and Bootstrap-era UI conventions.',
            'Similar controls and workflows had diverged without clear rules.',
            'Projects had to organize, assign, answer, review, and approve hundreds or thousands of RFP questions.',
            'The problem was not missing features but the absence of a coherent model for combining and extending them.',
          ],
          [
            'Old Projects overview',
            'Close-up showing divergent controls or page-based navigation',
            'Optional inventory of button or interaction variants',
          ],
          'Framework history and a full critique of the previous application.',
        ),
        section(
          'small-experiment',
          'Keeping the experiment small enough to become real',
          '90–120 words',
          'Aaron and Thomas intentionally kept early exploration small so they could demonstrate an integrated alternative before organizational process fragmented it.',
          [
            'Aaron recruited Thomas and they recognized shared opportunities in architecture and interaction design.',
            'Thomas began the React prototype; both contributed heavily to the concept and interaction system.',
            'A working product let colleagues react to connected workflows rather than isolated mockups.',
            'The approach created speed and clarity but delayed shared ownership.',
          ],
          [
            'Earliest usable prototype overview',
            'Progression showing the concept becoming more complete',
            'Optional lightweight timeline from late 2018 through rollout',
          ],
          'The secrecy decision, personalities involved, and alternative collaboration models Aaron would use now.',
        ),
        section(
          'projects-workspace',
          'Reframing the core RFP workspace',
          '130–160 words',
          'The new Projects workspace turned scattered pages into a coherent working environment organized around the phases and responsibilities of an RFP.',
          [
            'A persistent project surface replaced navigation between disconnected pages.',
            'A tabbed sidebar exposed working modes without losing project context.',
            'The outline made structure, ownership, completion, and review progress visible and bulk-editable.',
            'Aaron originated a timeline for deadlines, section commitments, and project-manager milestones.',
            'An assets view kept supporting files and appendices within project context.',
          ],
          [
            'Full Projects workspace overview',
            'Outline view showing hierarchy, ownership, and progress',
            'Timeline view showing deadlines and milestones',
            'Assets/resources view',
          ],
          'Detailed feature behavior and additional sidebar experiments.',
        ),
        section(
          'product-handoff',
          'A prototype people wanted became a product teams had to inherit',
          '100–130 words',
          'Positive customer-facing response accelerated rollout, while legitimate engineering concerns exposed the difference between proving a direction and operating it safely.',
          [
            'Designers and Customer Success saw the potential; Sales pressure helped create rollout momentum.',
            'Customers and prospects preferred the new experience in demonstrations.',
            'The Projects team’s senior PM raised fair concerns about ownership and missing test coverage.',
            'The prototype accumulated product expectations before its test and handoff strategy caught up.',
            'Feature parity and customer eligibility became central to rollout.',
          ],
          [
            'Internal demo or rollout artifact',
            'Parity or eligibility planning material',
            'Customer-facing comparison if rights permit',
          ],
          'The PM’s identity, personal tension, and a detailed argument about prototype testing.',
        ),
        section(
          'system-engineer',
          'From Principal Designer to the engineer behind the system',
          '110–140 words',
          'After Thomas left, Aaron changed roles and concentrated on making the new product legible and extendable to the teams inheriting it.',
          [
            'Thomas spent his final period improving test coverage before leaving in June 2020.',
            'Aaron continued the transfer, formally becoming Senior UX Engineer in January 2021.',
            'He built high-use and high-complexity React components with aligned APIs and TypeScript guidance.',
            'Designers received a Figma library; engineers received living examples, documentation, and tests.',
            'Accessibility and responsive behavior were part of the component contract.',
          ],
          [
            'Figma library overview',
            'Component documentation overview',
            'Typed props, variants, or implementation guidance',
            'Test or accessibility guidance if visually understandable',
          ],
          'How the handoff affected Thomas, deeper organizational friction, and the mechanics of rebuilding trust.',
        ),
        section(
          'sortable-table',
          'One component that demonstrates the whole approach',
          '120–150 words',
          'The sortable table connects interaction design, API design, accessibility, responsiveness, documentation, and testing in one reusable foundation.',
          [
            'A generic TypeScript component with predictable prop names and object shapes.',
            'Optional render props for headers, column headers, rows, keyed cells, and footers.',
            'Desktop sorting and keyboard navigation.',
            'Transformation into a sortable card list on smaller screens.',
            'Living examples with commented code and Cypress tests.',
            'Developers could discover and anticipate the API while working.',
          ],
          [
            'Desktop table',
            'Mobile card-list transformation',
            'Component API or autocomplete example',
            'Documentation/example page',
          ],
          'TypeScript generics, render-prop mechanics, and detailed accessibility behavior.',
        ),
        section(
          'outcomes',
          'What changed',
          '90–120 words',
          'The redesigned frontend became Loopio, teams began extending it, and the shared system provided practical rails for that work.',
          [
            'The new application replaced the previous frontend during Aaron’s tenure.',
            'Product teams were adding features within its patterns before he left.',
            'Sales found the new product easier to present.',
            'The team observed stronger engagement in Projects and the Library; Aaron cannot quantify the change.',
            'Current Loopio imagery retains recognizable parts of the product and system.',
          ],
          [
            'Shipped-product overview',
            'Later feature built by another team using the system',
            'Historical/current comparison showing endurance',
          ],
          'Detailed customer anecdotes and adoption discussion.',
        ),
        section(
          'ownership-lesson',
          'The lesson was bigger than the interface',
          '70–100 words',
          'Aaron would preserve the speed of a small initial team while involving future owners earlier and establishing the handoff contract before prototype code became product code.',
          [
            'The initial constraint was useful; delayed ownership was costly.',
            'Documentation and availability rebuilt trust but arrived after avoidable friction.',
            'Today Aaron would define the point when an experiment becomes shared infrastructure and its contribution and testing expectations activate.',
          ],
          ['No asset required; let the candour land without decoration.'],
          'Specific personalities and speculation about why Thomas left.',
        ),
      ],
      askMeAbout: [
        'How a working prototype changed the organization’s sense of what was possible',
        'Designing a component API that helps engineers anticipate how the system works',
        'What Aaron learned about transferring ownership of a successful skunkworks project',
      ],
      leaveOff: [
        'Criticism of the original design or engineering team’s product knowledge',
        'The senior PM’s identity',
        'A detailed argument against prototype tests',
        'Speculation about why Thomas left',
        'Funding-stage or valuation causality',
        'Redux and framework commentary that does not advance the story',
        'A full list of components',
      ],
      assets: [
        asset('old-overview', 'Best old-product overview'),
        asset('projects-overview', 'Best redesigned Projects overview'),
        asset('outline-view', 'Outline sidebar state'),
        asset('timeline-view', 'Timeline sidebar state'),
        asset('assets-view', 'Assets/resources sidebar state'),
        asset('figma-system', 'Figma design-system overview'),
        asset('component-docs', 'Production component documentation overview'),
        asset('desktop-table', 'Sortable table on desktop'),
        asset('mobile-table', 'Sortable card list on mobile'),
        asset('current-endurance', 'Current Loopio screen showing endurance'),
      ],
      factChecks: [
        'Resolve whether production documentation used Storybook, the custom JSON-schema system, or both at different stages.',
        'Present Projects and Library engagement as a remembered team observation, not a metric.',
        'Do not connect the redesign causally to a funding round or valuation.',
      ],
    },
  },
}
