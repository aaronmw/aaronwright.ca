import { transformPortfolioMarkdown } from './portfolio'

// The staged grid biography is independent of the published portfolio copy.
export const mosaicAboutCopy = {
  overviewMarkdown: transformPortfolioMarkdown(`
I’m hooked on turning ideas into working software and building tools that help others do the same. I love a good, candid critique—giving it, getting it, and making the work better together as only a strong team can. At **FreshBooks**, **Loopio**, and **Informal Systems** I worked on product designs and the systems behind them.

I’ve built shared React component libraries and taught interaction design for the **York/Sheridan School of Design** in Toronto. I’ve also spent countless hours designing and building my own pet projects, ranging from tools to toys both digital and tangible.

My adoption of AI tools has made me quicker and afforded for much more rapid experimentation. Suffice to say, I’m *very excited* for the future of human-computer interaction design.
`),
  detailsMarkdown: transformPortfolioMarkdown(`
## Situations I know well

- A successful product has outgrown the interface and frontend it started with.
- A redesign needs to improve familiar workflows without leaving existing customers behind.
- Different teams keep solving the same interface problems in different ways.
- Repetitive work has become so routine that people have stopped questioning it.

## What I’m like to work with

- I like making ideas tangible early, through sketches, prototypes, or working code.
- I’m comfortable moving between design critique and implementation details.
- I enjoy teaching through real problems and working examples.
- I notice everyday friction and tend to build something about it.

## Where I’m most useful

- Making complex product workflows clearer and easier to navigate.
- Building design systems with the components, documentation, and examples teams need to use them.
- Helping designers and engineers develop their judgment through critique and mentoring.
- Improving how a team works through practical tooling, automation, and AI.
`),
}
