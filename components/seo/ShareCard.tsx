import { portfolioImagePalette as palette } from '@/lib/portfolioPalette'
import { SITE_NAME, SITE_URL } from '@/lib/siteMetadata'
import type { ShareCardContent } from '@/lib/shareCards'

// One static composition for every Open Graph and Twitter image.
export function ShareCard({
  card,
  logo,
  artwork,
}: {
  card: ShareCardContent
  logo: string
  artwork?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        padding: 64,
        background: palette.background,
        color: palette.text,
        fontFamily: 'IBM Plex Mono',
        gap: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 512,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            color: palette.muted,
            fontSize: 22,
          }}
        >
          <img
            src={logo}
            width={49}
            height={49}
            alt=""
          />
          <span>{card.artwork ? 'SELECTED WORK' : 'DESIGN + ENGINEERING'}</span>
        </div>
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            paddingBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 56,
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            {card.title}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              fontSize: card.slug === 'portfolio' ? 32 : 25,
              lineHeight: 1.4,
              color: palette.muted,
            }}
          >
            {card.description}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderTop: `2px solid ${palette.border}`,
            paddingTop: 20,
            fontSize: 20,
          }}
        >
          <span>{SITE_NAME}</span>
          <span style={{ color: palette.accent }}>
            {new URL(SITE_URL).hostname}
          </span>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 520,
          height: 502,
          overflow: 'hidden',
          background: artwork && !card.artwork?.clipToPhoneFrame ? palette.surface : 'transparent',
          borderRadius: artwork && !card.artwork?.clipToPhoneFrame ? 12 : 0,
        }}
      >
        {artwork ? (
          <img
            src={artwork}
            alt={card.artwork!.alt}
            width={520}
            height={502}
            style={{
              objectFit: card.artwork!.fit,
              objectPosition:
                card.artwork!.fit === 'cover' ? 'top center' : 'center',
            }}
          />
        ) : (
          <img
            src={logo}
            alt=""
            width={420}
            height={420}
          />
        )}
      </div>
    </div>
  )
}
