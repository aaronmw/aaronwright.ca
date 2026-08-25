# FreshBooks and Loopio case-study brochure outlines

## Editorial contract

These pages are conversation starters, not project archives. Each should let a recruiter or senior designer understand the problem, Aaron's contribution, and why the work mattered in roughly three minutes. The richer interview questionnaire remains the source for follow-up discussion.

Aim for:

- 650–850 words per case study
- 6–8 sections, each advancing one claim
- 6–9 purposeful assets rather than exhaustive galleries
- short paragraphs, captions, pull quotes, and contribution labels
- one interaction or implementation example with enough depth to establish craft
- one candid limitation or lesson
- three deliberate interview hooks

Every asset must do at least one job: establish the before-state, explain a decision, distinguish Aaron's contribution, substantiate adoption, or show what endured. Assets that merely show another screen should stay out.

---

# FreshBooks

## Recommended positioning

### Headline

**Making accounting approachable without pretending it was simple.**

### Alternate headlines

- **Rebuilding FreshBooks around the way small businesses actually work.**
- **From a collection of accounting tools to a product teams could extend.**

### Standfirst

I helped reimagine FreshBooks as a coherent platform, then designed the interaction patterns, customer transition, and shared system that made the change usable for small-business owners and buildable by product teams.

### Context strip

- **Role:** UX Designer; one of two designers selected for the initial redesign group
- **Company:** FreshBooks, approximately 100–250 people during Aaron's tenure
- **Tenure:** September 2012–July 2018
- **Collaborators:** Product and creative leadership, another product designer, senior product managers and engineers, Customer Support
- **Scope:** Core product redesign, migration research, interaction patterns, design-system foundations

### Narrative spine

FreshBooks had grown from founder-built invoicing software into a collection of accounting tools. The redesign was not simply a visual modernization: it was an opportunity to turn years of accumulated product knowledge into a coherent system without forcing customers to relearn how to run their businesses.

## Page structure

### 1. A product that had outgrown its foundations

**Copy budget:** 80–110 words

**Claim:** The existing product still worked, but its visual language, navigation, technical architecture, and inconsistent patterns made every new feature harder to design, build, and sell confidently.

**Include:**

- The old multipage application looked and behaved like an earlier era of the web.
- Features had accumulated without a governing interaction system.
- User-controlled application colours made colour unreliable as a semantic cue.
- The design team repeatedly solved the same problems and compromised new work to fit the old product.

**Asset jobs:**

- One representative legacy-product overview
- One example of inconsistent or scattered controls
- Optional comparison showing a user-selected theme obscuring a primary action

**Keep for the interview:** Competitive positioning, premium pricing concerns, and the full catalogue of legacy constraints.

### 2. Redesigning the product as a system

**Copy budget:** 100–130 words

**Claim:** The redesign team established a coherent product model and a set of principles that could guide decisions beyond individual screens.

**Include:**

- A small cross-functional group explored divergent directions, prototyped, and tested weekly.
- Entity-oriented navigation remained the foundation, while client pages supported customers who organized their work client-first.
- WYSIWYG creation made invoices and client records feel recognizable and approachable.
- Colour moved from personal application theming to customer-facing invoice branding, allowing the product to reclaim colour for meaning.

**Asset jobs:**

- A guiding-principles slide or workshop artifact
- One information-architecture or early-direction artifact
- A client or invoice creation screen that makes the WYSIWYG concept obvious

**Attribution note:** Describe the redesign as collaborative. Identify the WYSIWYG alignment, semantic-colour decision, and support for both entity-first and client-first paths with the ownership language recorded in the questionnaire.

### 3. A place for complexity to live

**Copy budget:** 130–160 words

**Claim:** Aaron originated the metadata pane to keep common creation flows focused while making advanced functionality consistent and discoverable.

**Include:**

- Payment reminders, discounts, taxes, and other invoice features had previously been scattered around the interface.
- Those controls did not belong directly on a skeuomorphic invoice, but hiding them entirely would make a capable product feel incomplete.
- The metadata pane presented feature names and statuses in one predictable place.
- Selecting a feature moved the pane into a focused configuration view.
- The pattern gave future teams a constrained, repeatable way to extend an entity.

**Asset jobs:**

- A full creation screen showing the entity and metadata pane together
- A two-state sequence: feature index → focused configuration
- Optional annotation identifying status, navigation, and progressive-disclosure behavior

**This is the signature interaction.** Give it the most visual space on the page.

**Keep for the interview:** Other progressive-disclosure arguments, the card/list disagreement, and detailed testing observations.

### 4. Letting customers choose when change was safe

**Copy budget:** 110–140 words

**Claim:** Transition research changed migration from a launch event into a reversible customer decision.

**Include:**

- Aaron led the design research for the team responsible for moving customers between products.
- Dozens of interviews conducted personally—and approximately 100 across the team—showed that timing mattered as much as usability.
- Even customers who preferred the redesign needed the familiar product available when closing their books or encountering a missing workflow.
- The resulting two-way switch reduced the risk of trying the new product and helped the organization sequence feature parity and rollout eligibility.

**Asset jobs:**

- “Try the new design” entry point
- “Switch back” control or reassurance messaging
- A parity, migration, eligibility, or research-planning artifact

**Language guardrail:** Use “approximately” for participant counts unless a source confirms the number.

### 5. Helping teams build the same product

**Copy budget:** 100–130 words

**Claim:** Aaron turned emerging product patterns into shared resources that improved the work of designers and engineers.

**Include:**

- A comprehensive Sketch library spanning colours and type through complete page patterns
- Documentation showing what patterns looked like and where they appeared in the live product
- Prototypes and CodePens that helped engineers implement or extend Ember components
- Internal talks, onboarding, and Aaron's formal ownership of the design system
- The practical effect: less recreation, fewer near-matches, and more reliable translation from design intent to production

**Asset jobs:**

- A broad design-library overview
- One component page showing variants and guidance
- One implementation reference or documentation example

**Keep for the interview:** Sketch techniques, component contribution mechanics, internal presentations, and examples of teams using the system.

### 6. What endured—and what I would protect now

**Copy budget:** 90–120 words

**Claim:** The platform and its core interaction patterns endured, while the compromises reveal how Aaron's product judgment has matured.

**Include:**

- The redesigned product reached general availability and eventually replaced the legacy experience.
- Cards, lists, entity creation, and side-pane disclosure remain visible in FreshBooks today.
- The strongest hindsight lesson is not “I would use React”: it is protecting frequent and power users from a novice-first product becoming inefficient at scale.
- Bulk workflows and denser modes should have received more deliberate advocacy.

**Asset jobs:**

- One historical redesign screen paired with a current equivalent
- A present-day list, creation flow, or side-pane pattern showing continuity

**Language guardrail:** Describe current-product similarities as visual observation, not proof that every implementation is unchanged.

## Suggested “Ask me about” block

- How research led to a reversible migration instead of a forced launch
- Why progressive disclosure is different from removing necessary complexity
- What it took to turn a redesign into a system other teams could extend

## Material to leave off the brochure

- The separate-company validation experiment unless directly asked
- A complete redesign chronology
- Names of every participant
- The full card-versus-list debate
- “Toyish” customer language; retain the underlying bulk-workflow lesson
- Speculation about competitive decline or revenue without supporting data
- Detailed Ember-versus-React hindsight

## FreshBooks asset shortlist

Prioritize finding these before selecting secondary screens:

1. Best legacy-product overview
2. Best redesigned-product overview
3. WYSIWYG invoice or client creation
4. Metadata pane index
5. Metadata pane focused configuration
6. New-product entry and switch-back controls
7. Sketch/design-system overview
8. One detailed component or documentation page
9. One present-day screen demonstrating endurance

---

# Loopio

## Recommended positioning

### Headline

**Proving a better Loopio—then making it buildable by everyone else.**

### Alternate headlines

- **Turning a two-person prototype into Loopio's product foundation.**
- **From an unofficial redesign to a shared product platform.**

### Standfirst

I partnered with a senior frontend developer to reimagine Loopio's core RFP workflow, helped build the momentum to replace its frontend, then stayed to turn our prototype into a tested, documented system that product teams could safely own and extend.

### Context strip

- **Roles:** Principal Product Designer → Senior UX Engineer
- **Aaron at Loopio:** July 2018–January 2022
- **Thomas at Loopio:** August 2018–June 2020
- **Core partnership:** Aaron Wright and Thomas Cheng, with later collaboration across Product, Design, Engineering, Sales, and Customer Success
- **Scope:** Projects redesign, React frontend, Figma and production component systems, documentation, testing, adoption

### Narrative spine

The central story has three connected acts: two people made a more coherent product tangible; customer-facing teams turned that possibility into organizational momentum; and Aaron took responsibility for making the resulting frontend understandable, maintainable, and useful to the teams inheriting it.

## Page structure

### 1. A mature product still wearing its prototype

**Copy budget:** 80–110 words

**Claim:** Loopio's founder-built frontend and accumulated patterns limited product quality and the speed at which teams could respond to a growing market.

**Include:**

- The product mixed jQuery, Backbone, React, Redux, and Bootstrap-era UI conventions.
- Similar controls and workflows had diverged without clear rules.
- The core Projects surface had to help teams organize, assign, answer, review, and approve hundreds or thousands of RFP questions.
- The problem was not a lack of features; it was the absence of a coherent model for combining and extending them.

**Asset jobs:**

- One old Projects overview
- One close-up showing divergent controls or dense page-based navigation
- Optional inventory of repeated button or interaction variants

**Language guardrail:** Avoid dismissing the previous product or the people who built it. Focus on what the company had outgrown.

### 2. Keeping the experiment small enough to become real

**Copy budget:** 90–120 words

**Claim:** Aaron and Thomas intentionally kept early exploration small so they could demonstrate an integrated alternative before organizational process fragmented it.

**Include:**

- Aaron recruited Thomas and they quickly recognized shared opportunities in product architecture and interaction design.
- Thomas began the React prototype; both contributed heavily to the product concept and emerging interaction system.
- A working product let colleagues react to connected workflows rather than isolated mockups.
- The approach created speed and clarity, but delayed shared ownership—a tradeoff the page should acknowledge rather than celebrate uncritically.

**Asset jobs:**

- Earliest usable prototype overview
- One progression showing the concept becoming more complete
- Optional lightweight timeline from late 2018 through production rollout

**Keep for the interview:** The decision to work secretly, the personalities involved, and alternative collaboration models Aaron would use now.

### 3. Reframing the core RFP workspace

**Copy budget:** 130–160 words

**Claim:** The new Projects workspace turned scattered pages into a coherent working environment organized around the phases and responsibilities of an RFP.

**Include:**

- A persistent project surface replaced navigation between disconnected pages.
- A tabbed sidebar exposed different working modes without losing project context.
- The outline view made document structure, ownership, completion, and review progress visible and bulk-editable.
- Aaron originated the timeline view for deadlines, section-level commitments, and project-manager milestones.
- An assets view kept supporting files and appendices within the project context.

**Asset jobs:**

- Full Projects workspace overview
- Outline view showing hierarchy, ownership, and progress
- Timeline view showing deadlines and milestones
- Assets/resources view

**Attribution note:** Credit the overall redesign and outline view jointly. Identify the project-sidebar concept and timeline view as Aaron-originated; describe the resource view as Aaron-led.

### 4. A prototype people wanted became a product teams had to inherit

**Copy budget:** 100–130 words

**Claim:** Positive customer-facing response accelerated rollout, while legitimate engineering concerns exposed the difference between proving a direction and operating it safely.

**Include:**

- Designers and Customer Success saw the prototype's potential; Sales pressure helped move the product organization toward rollout.
- Customers and prospects preferred the new experience in demonstrations.
- The Projects team's senior PM raised fair concerns about ownership and missing test coverage.
- The prototype had begun accumulating product expectations before its test and handoff strategy caught up.
- Feature parity and customer eligibility became central to rollout.

**Asset jobs:**

- Internal demo or rollout artifact
- Parity or eligibility planning material
- A customer-facing comparison if attribution and rights permit

**Language guardrail:** Do not characterize the PM as opposing the work “on principle.” Her ownership and testing objections strengthen this story.

### 5. From Principal Designer to the engineer behind the system

**Copy budget:** 110–140 words

**Claim:** After Thomas left, Aaron changed roles and concentrated on making the new product legible and extendable to the teams inheriting it.

**Include:**

- Thomas spent his final period improving test coverage before leaving in June 2020.
- Aaron continued the transfer, formally becoming Senior UX Engineer in January 2021.
- He built high-use and high-complexity React components, aligned their APIs, and supplied contextual TypeScript guidance.
- Designers received a comprehensive Figma library; engineers received living examples, documentation, and tests.
- Accessibility and responsive behavior were part of the component contract rather than cleanup work.

**Asset jobs:**

- Figma library overview
- Component documentation overview
- Example showing implementation guidance, variants, or typed props
- Test or accessibility guidance if visually understandable

**Keep for the interview:** How the handoff affected Thomas, the deeper organizational friction, and the mechanics of rebuilding trust.

### 6. One component that demonstrates the whole approach

**Copy budget:** 120–150 words

**Claim:** The sortable table demonstrates Aaron's ability to connect interaction design, API design, accessibility, responsiveness, documentation, and testing in one reusable foundation.

**Include:**

- A generic TypeScript component with predictable prop names and object shapes
- Optional render props for headers, column headers, rows, keyed cells, and footers
- Desktop sorting and keyboard navigation
- Transformation into a sortable card list on smaller screens
- Living examples with commented code and Cypress tests
- The intent: developers should be able to discover and anticipate the component API while working

**Asset jobs:**

- Desktop table
- Mobile card-list transformation
- Component API or autocomplete example
- Documentation/example page

**This is the signature implementation example.** It should receive the most explanatory copy after the Projects workspace.

### 7. What changed

**Copy budget:** 90–120 words

**Claim:** The redesigned frontend became Loopio, teams began extending it, and the shared system provided practical rails for that work.

**Include:**

- The new application replaced the previous frontend during Aaron's tenure.
- Product teams were already adding features within its patterns before he left.
- Sales found the new product easier to present.
- The team observed stronger engagement in Projects and the Library after launch; Aaron did not own the analytics and cannot quantify the change.
- Current Loopio imagery appears to retain recognizable parts of the product and system.

**Asset jobs:**

- Shipped product overview
- Example of a later feature built by another team using the system
- Historical/current comparison showing endurance

**Language guardrails:**

- Present engagement as a remembered internal observation, not a metric.
- Do not connect the redesign causally to a funding round or valuation.
- “Customers and Sales preferred it” is more defensible than “everyone loved it.”

### 8. The lesson was bigger than the interface

**Copy budget:** 70–100 words

**Claim:** Aaron would preserve the speed of a small initial team while involving future owners earlier and establishing the handoff contract before prototype code became product code.

**Include:**

- The initial constraint was useful; the delayed ownership was costly.
- Documentation and availability rebuilt trust, but they arrived after avoidable friction.
- Today Aaron would define when an experiment becomes shared infrastructure, who inherits it, and what testing and contribution expectations activate at that threshold.

**Asset jobs:** None required. Let the candour land without decoration.

## Suggested “Ask me about” block

- How a working prototype changed the organization's sense of what was possible
- Designing a component API that helps engineers anticipate how the system works
- What Aaron learned about transferring ownership of a successful skunkworks project

## Material to leave off the brochure

- Criticism of the original design or engineering team's product knowledge
- The senior PM's identity
- A detailed argument against prototype tests
- Speculation about why Thomas left
- Funding-stage or valuation causality
- Redux and framework commentary that does not advance the story
- A full list of components

## Loopio asset shortlist

Prioritize finding these before selecting secondary screens:

1. Best old-product overview
2. Best redesigned Projects overview
3. Outline sidebar state
4. Timeline sidebar state
5. Assets/resources sidebar state
6. Figma design-system overview
7. Production component documentation overview
8. Sortable table on desktop
9. Sortable card list on mobile
10. Current Loopio screen showing endurance

## Factual item to resolve before publishing

Aaron's current LinkedIn description says the system spanned “Figma, React, and Storybook,” while the interview recollection says Storybook was evaluated but replaced with a custom JSON-schema-powered documentation system. Confirm which was used in production, or whether Storybook appeared at a different stage, before naming the documentation technology publicly.

---

# Shared collection framing

## Portfolio-level throughline

Aaron learns complex products deeply, makes their underlying logic clearer, and turns that clarity into systems that improve both the customer experience and the way teams build.

## Why both stories belong

- **FreshBooks** demonstrates product judgment, customer research, progressive disclosure, and safe migration during Aaron's first large platform redesign.
- **Loopio** demonstrates greater agency, technical implementation, system adoption, and the organizational responsibility required to turn a compelling prototype into shared infrastructure.
- Together they show progression from contributing to a cross-functional redesign to deliberately initiating, implementing, and operationalizing one.

## Recommended collection order

Lead with **Loopio** for roles emphasizing design systems, design engineering, principal-level ownership, or design/engineering leadership. Follow with **FreshBooks** to show the customer-research and product-strategy foundation beneath that later technical leadership.

Lead with **FreshBooks** only when the target role emphasizes product discovery, migration, small-business software, or customer-centered platform redesign more than production system building.

## Asset-selection pass

Once candidate images are gathered, classify each one before placing it:

1. **Story job:** before-state, decision, contribution, adoption, or endurance
2. **Claim supported:** one sentence the image makes more credible or easier to understand
3. **Attribution:** Aaron, shared, another person's work, or unknown
4. **Usage:** safe to publish, redact first, or reference only
5. **Placement:** the exact brochure section it belongs to

If an image has no clear story job or placement, exclude it from the brochure even if it is attractive.
