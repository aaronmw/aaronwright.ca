import { useEffect } from 'react'

/** Next's badge lives in a shadow root; page CSS cannot target it separately
 * from the error overlay. Hide only the badge for the lifetime of a viewer. */
export function useMosaicDevIndicatorHidden(hidden: boolean) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !hidden) return
    const injected = new Map<ShadowRoot, HTMLStyleElement>()
    function hideBadge() {
      document.querySelectorAll('nextjs-portal').forEach(portal => {
        const root = portal.shadowRoot
        if (!root || injected.has(root)) return
        const style = document.createElement('style')
        // Verified against Next 16.4's devtools-indicator source. Do not hide
        // the portal itself: build/runtime error overlays still need to render.
        style.textContent = '#devtools-indicator { display: none !important; }'
        root.appendChild(style)
        injected.set(root, style)
      })
    }
    hideBadge()
    // Handle the development portal arriving after a direct-link viewer opens.
    const observer = new MutationObserver(hideBadge)
    observer.observe(document.body, { childList: true })
    return () => {
      observer.disconnect()
      injected.forEach(style => style.remove())
    }
  }, [hidden])
}
