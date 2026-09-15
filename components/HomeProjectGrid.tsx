import Image from 'next/image'
import Link from 'next/link'
import { PortfolioName } from '@/components/PortfolioName'
import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import { portfolioSlides } from '@/lib/portfolio'
import { portfolioFont } from '@/lib/portfolioFonts'
import {
  PortfolioInlineMarkdown,
  PortfolioLedgerFrame,
  PortfolioLedgerLabel,
} from '@/components/portfolio/presentation/PortfolioText'

function isVideoSource(src: string) {
  return /\.(webm|mp4|m4v|ogv|ogg)(?:$|\?)/i.test(src)
}

function getProjectImage(project: PortfolioProject): PortfolioScreenshot | undefined {
  return (
    project.cover_image ??
    project.screenshots.find(candidate => !isVideoSource(candidate.src))
  )
}

function projectCellClass(index: number) {
  if (index === 0) {
    return 'md:col-span-12 lg:min-h-[42dvh]'
  }

  if (index < 3) {
    return 'md:col-span-6 lg:min-h-[54dvh]'
  }

  return 'md:col-span-6'
}

export function HomeProjectGrid() {
  return (
    <main
      className={`${portfolioFont.className} ${portfolioFont.variable} portfolio-typography min-h-dvh bg-portfolio-surface text-portfolio-text`}
    >
      <header className="flex min-h-20 items-center justify-between gap-8 border-b border-portfolio-shaded px-6 py-4 sm:px-8 lg:px-12">
        <div>
          <PortfolioName />
          <p className="mt-1 font-normal text-portfolio-text-dimmed">
            Product design · frontend systems
          </p>
        </div>
        <nav
          className="flex items-center gap-6 font-bold"
          aria-label="Primary"
        >
          <Link
            href="/work"
            className="outline-none transition-colors hover:text-portfolio-text-dimmed focus-visible:text-portfolio-text-dimmed"
          >
            Carousel
          </Link>
          {/* A static PDF is a document navigation, not a Next.js route. */}
          {/* react-doctor-disable-next-line react-doctor/nextjs-no-a-element */}
          <a
            href="/resume.pdf"
            className="outline-none transition-colors hover:text-portfolio-text-dimmed focus-visible:text-portfolio-text-dimmed"
          >
            Resume
          </a>
        </nav>
      </header>

      <section
        className="grid grid-cols-1 gap-px bg-portfolio-shaded md:grid-cols-12"
        aria-label="Selected work"
      >
        {portfolioSlides.map((project, index) => {
          const screenshot = getProjectImage(project)

          return (
            <article
              key={project.id}
              className={`group relative min-h-[44dvh] overflow-hidden bg-portfolio-black ${projectCellClass(index)}`}
            >
              <Link
                href={`/work/${project.slug}`}
                className="absolute inset-0 isolate flex touch-manipulation items-end overflow-hidden p-6 outline-none sm:p-8 lg:p-10"
              >
                {screenshot ? (
                  <>
                    <Image
                      src={screenshot.src}
                      alt=""
                      fill
                      unoptimized
                      loading={index === 0 ? 'eager' : undefined}
                      sizes={index === 0 ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
                      className="z-[var(--portfolio-layer-card-media)] object-cover opacity-75 saturate-[0.8] transition-[transform,opacity,filter] duration-[var(--portfolio-motion-thumbnail)] ease-out group-hover:scale-[1.025] group-hover:opacity-90 group-hover:saturate-100 group-focus-within:scale-[1.025] group-focus-within:opacity-90 group-focus-within:saturate-100 motion-reduce:transition-none"
                    />
                    <span className="absolute inset-0 z-[var(--portfolio-layer-card-shade)] bg-gradient-to-t from-portfolio-black via-portfolio-black/15 to-portfolio-black/10 transition-colors duration-[var(--portfolio-motion-thumbnail)] group-hover:from-portfolio-black/85 group-focus-within:from-portfolio-black/85 motion-reduce:transition-none" />
                  </>
                ) : null}
                <span className="pointer-events-none absolute inset-2 border border-transparent transition-colors duration-[var(--portfolio-motion-state)] group-focus-within:border-portfolio-accent" />

                <PortfolioLedgerFrame className="w-full max-w-[40rem]">
                  <div className="grid grid-cols-[min-content_minmax(0,1fr)]">
                    <div className="min-w-0 whitespace-nowrap py-2">
                      <PortfolioLedgerLabel>
                        Project
                      </PortfolioLedgerLabel>
                      <span className="mt-1 block">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="min-w-0 py-2">
                      <PortfolioLedgerLabel>
                        Company / product
                      </PortfolioLedgerLabel>
                      <h2 className="mt-1 font-bold">
                        {project.title}
                      </h2>
                    </div>
                  </div>
                  <div className="block min-w-0 py-2">
                    <PortfolioLedgerLabel>Summary / intro</PortfolioLedgerLabel>
                    <span className="mt-1 block font-normal">
                      <PortfolioInlineMarkdown>
                        {project.blurb}
                      </PortfolioInlineMarkdown>
                    </span>
                  </div>
                </PortfolioLedgerFrame>
              </Link>
            </article>
          )
        })}
      </section>
    </main>
  )
}
