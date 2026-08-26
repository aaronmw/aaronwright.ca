import Image from 'next/image'
import Link from 'next/link'
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

function getProjectImage(project: PortfolioProject): PortfolioScreenshot {
  const screenshot =
    project.cover_image ??
    project.screenshots.find(candidate => !isVideoSource(candidate.src))

  if (!screenshot) {
    throw new Error(`Missing homepage image for ${project.slug}`)
  }

  return screenshot
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
      className={`${portfolioFont.className} ${portfolioFont.variable} min-h-dvh bg-resume-ink text-resume-paper`}
    >
      <header className="flex min-h-20 items-center justify-between gap-8 border-b border-resume-paper/20 px-6 py-4 sm:px-8 lg:px-12">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-normal">
            Aaron M. Wright
          </h1>
          <p className="mt-1 text-sm font-normal text-resume-paper/60">
            Product design · frontend systems
          </p>
        </div>
        <nav
          className="flex items-center gap-6 text-sm font-bold"
          aria-label="Primary"
        >
          <Link
            href="/work"
            className="outline-none transition-opacity hover:opacity-65 focus-visible:opacity-65"
          >
            Carousel
          </Link>
          <a
            href="/resume.pdf"
            className="outline-none transition-opacity hover:opacity-65 focus-visible:opacity-65"
          >
            Resume
          </a>
        </nav>
      </header>

      <section
        className="grid grid-cols-1 gap-px bg-resume-paper/20 md:grid-cols-12"
        aria-label="Selected work"
      >
        {portfolioSlides.map((project, index) => {
          const screenshot = getProjectImage(project)
          const isCaseStudy = Boolean(project.cover_image)

          return (
            <article
              key={project.id}
              className={`group relative min-h-[44dvh] overflow-hidden bg-black ${projectCellClass(index)}`}
            >
              <Link
                href={`/work/${project.slug}`}
                className="absolute inset-0 isolate flex touch-manipulation items-end overflow-hidden p-6 outline-none sm:p-8 lg:p-10"
              >
                <Image
                  src={screenshot.src}
                  alt=""
                  fill
                  unoptimized
                  loading={index === 0 ? 'eager' : undefined}
                  sizes={
                    index === 0
                      ? '(min-width: 768px) 100vw, 100vw'
                      : '(min-width: 768px) 50vw, 100vw'
                  }
                  className="-z-20 object-cover opacity-75 saturate-[0.8] transition-[transform,opacity,filter] duration-500 ease-out group-hover:scale-[1.025] group-hover:opacity-90 group-hover:saturate-100 group-focus-within:scale-[1.025] group-focus-within:opacity-90 group-focus-within:saturate-100 motion-reduce:transition-none"
                />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/15 to-black/10 transition-colors duration-500 group-hover:from-black/85 group-focus-within:from-black/85 motion-reduce:transition-none" />
                <span className="pointer-events-none absolute inset-2 border border-transparent transition-colors duration-200 group-focus-within:border-resume-signal" />

                <PortfolioLedgerFrame className="w-full max-w-[40rem]">
                  <div className="grid grid-cols-[min-content_minmax(0,1fr)]">
                    <div className="min-w-0 whitespace-nowrap py-2">
                      <PortfolioLedgerLabel>
                        {isCaseStudy ? 'Case study' : 'Project'}
                      </PortfolioLedgerLabel>
                      <span className="mt-1 block">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="min-w-0 py-2">
                      <PortfolioLedgerLabel>
                        Company / product
                      </PortfolioLedgerLabel>
                      <h2 className="mt-1 [font-size:inherit] font-normal leading-[inherit] tracking-normal">
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
