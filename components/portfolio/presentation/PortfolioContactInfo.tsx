'use client'

import Link from 'next/link'
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { OverscrollIndicator } from '@/components/OverscrollIndicator'
import { portfolioFont } from '@/lib/portfolioFonts'
import {
  MOBILE_SECTION_CONTENT_PADDING_LEFT,
  MOBILE_SECTION_CONTENT_PADDING_RIGHT,
} from '../mobileLayout'
import { FiveByFive } from './FiveByFive'
import { PortfolioLogoMark } from './PortfolioLogoMark'

const CONTACT_LINK_CLASS_NAME =
  'portfolio-contact-link underline decoration-1 underline-offset-[0.18em]'
const CONTROL_CLASS_NAME =
  'portfolio-prose-link shrink-0 border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent'

function ContactDetails({ layout }: { layout: 'inline' | 'stacked' }) {
  const inline = layout === 'inline'

  return (
    <address className="min-w-0 font-resume-mono font-normal text-portfolio-text not-italic">
      <div
        className={
          inline
            ? 'flex items-start gap-[var(--portfolio-default-spacing)]'
            : 'grid gap-y-[1lh]'
        }
      >
        <p className={inline ? 'text-right' : undefined}>
          302-70 Dyrgas Gate
          <br />
          Canmore, Alberta
          <br />
          T1W 3J6
        </p>
        <p
          className={`flex flex-col ${inline ? 'items-end text-right' : 'items-start'}`}
        >
          <a
            className={`${CONTACT_LINK_CLASS_NAME} break-all`}
            href="mailto:aaron@aaronwright.ca"
          >
            aaron@aaronwright.ca
          </a>
          <a
            className={CONTACT_LINK_CLASS_NAME}
            href="tel:+16477469426"
          >
            +1-647-746-9426
          </a>
          <Link
            className={CONTACT_LINK_CLASS_NAME}
            href="/resume.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Résumé PDF
          </Link>
        </p>
      </div>
    </address>
  )
}

export function PortfolioContactInfo() {
  return (
    <>
      <div className="portfolio-start-contact-details ml-auto shrink-0">
        <ContactDetails layout="inline" />
      </div>
      <DialogTrigger>
        <Button
          className={`portfolio-contact-trigger ml-auto whitespace-nowrap ${CONTROL_CLASS_NAME}`}
        >
          Contact Info
        </Button>
        <ModalOverlay
          className={`portfolio-typography ${portfolioFont.className} fixed inset-0 z-[var(--portfolio-layer-menu)] bg-portfolio-surface text-portfolio-text`}
          data-portfolio-contact-overlay
        >
          <Modal className="h-dvh w-full">
            <Dialog
              data-portfolio-contact-dialog
              className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-y-[1lh] pt-[var(--portfolio-header-text-edge-inset)] pb-[calc(var(--portfolio-frame-rule-size)+var(--portfolio-navigation-control-edge-offset)+env(safe-area-inset-bottom,0px))] outline-none"
              style={{
                paddingLeft: MOBILE_SECTION_CONTENT_PADDING_LEFT,
                paddingRight: MOBILE_SECTION_CONTENT_PADDING_RIGHT,
              }}
            >
              {({ close }) => (
                <>
                  <header className="flex items-start justify-between gap-x-[1ch]">
                    <Button
                      onPress={close}
                      aria-label="Back to main menu"
                      data-interactive-pop="off"
                      className="fixed grid size-[var(--portfolio-control-size)] place-items-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
                      style={{
                        top: 'var(--portfolio-header-edge-inset)',
                        left: 'calc(var(--portfolio-navigation-control-edge-offset) + env(safe-area-inset-left, 0px))',
                      }}
                    >
                      <PortfolioLogoMark className="text-portfolio-accent-decoration" />
                    </Button>
                    <Heading
                      slot="title"
                      className="font-bold uppercase"
                    >
                      Contact Info
                    </Heading>
                    <Button
                      onPress={close}
                      aria-label="Close contact info"
                      data-interactive-pop="off"
                      className="portfolio-theme-trigger fixed"
                      style={{
                        top: 'var(--portfolio-theme-control-edge-inset)',
                        right: 'calc(var(--portfolio-navigation-control-edge-offset) + env(safe-area-inset-right, 0px))',
                      }}
                    >
                      <FiveByFive variant="x" className="text-portfolio-accent-decoration" />
                    </Button>
                  </header>
                  <OverscrollIndicator
                    aria-label="Contact details"
                    role="region"
                    tabIndex={0}
                    persistentScrollbar
                    bottomScrollControl={<FiveByFive variant="down" />}
                    wrapperClassName="mx-auto h-full w-full max-w-[var(--resume-content-width)]"
                    contentClassName="flex min-h-full flex-col justify-center"
                    className="overflow-x-hidden outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent"
                  >
                    <ContactDetails layout="stacked" />
                  </OverscrollIndicator>
                </>
              )}
            </Dialog>
          </Modal>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[var(--portfolio-frame-rule-size)] bg-portfolio-accent-decoration"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[var(--portfolio-frame-rule-size)] bg-portfolio-accent-decoration"
          />
        </ModalOverlay>
      </DialogTrigger>
    </>
  )
}
