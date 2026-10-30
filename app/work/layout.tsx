import { MosaicPortfolio } from '@/components/mosaic/MosaicPortfolio'

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Keep the gallery alive when Back restores another route tree after a refresh.
  // Child pages own validation, redirects and route-specific metadata.
  return (
    <>
      <MosaicPortfolio />
      {children}
    </>
  )
}
