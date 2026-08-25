import Image from 'next/image'
import Link from 'next/link'
import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import { portfolioSlides } from '@/lib/portfolio'
import { SectionBlurb } from '@/components/portfolio/presentation/PortfolioText'

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
    <main className="min-h-dvh bg-black text-white">
      <header className="flex min-h-20 items-center justify-between gap-8 border-b border-white/20 px-6 py-4 sm:px-8 lg:px-12">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em]">
            Aaron M. Wright
          </p>
          <p className="mt-1 text-sm font-light text-white/60">
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
        className="grid grid-cols-1 gap-px bg-white/20 md:grid-cols-12"
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
                className="absolute inset-0 isolate flex items-end overflow-hidden p-6 outline-none sm:p-8 lg:p-10"
              >
                <Image
                  src={screenshot.src}
                  alt=""
                  fill
                  unoptimized
                  sizes={
                    index === 0
                      ? '(min-width: 768px) 100vw, 100vw'
                      : '(min-width: 768px) 50vw, 100vw'
                  }
                  className="-z-20 object-cover opacity-75 saturate-[0.8] transition-[transform,opacity,filter] duration-500 ease-out group-hover:scale-[1.025] group-hover:opacity-90 group-hover:saturate-100 group-focus-within:scale-[1.025] group-focus-within:opacity-90 group-focus-within:saturate-100 motion-reduce:transition-none"
                />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/15 to-black/10 transition-colors duration-500 group-hover:from-black/85 group-focus-within:from-black/85 motion-reduce:transition-none" />
                <span className="pointer-events-none absolute inset-2 border border-transparent transition-colors duration-200 group-focus-within:border-white" />

                <span className="block max-w-[60ch]">
                  <span className="mb-4 block text-xs font-black uppercase tracking-[0.24em] text-white/65">
                    {isCaseStudy ? 'Case study' : 'Project'} ·{' '}
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="block text-[clamp(2.4rem,5.5vw,6.5rem)] font-black uppercase leading-[0.86] tracking-[-0.045em]">
                    {project.title}
                  </span>
                  <SectionBlurb className="mt-5 block !max-w-[50ch] !text-base !leading-snug !text-white !opacity-80 sm:!text-lg">
                    {project.blurb}
                  </SectionBlurb>
                </span>
              </Link>
            </article>
          )
        })}
      </section>
    </main>
  )
}
