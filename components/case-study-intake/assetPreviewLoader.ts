type ObjectUrlApi = Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>

export function createAssetPreviewLoader(
  loadBlob: (id: string) => Promise<Blob | undefined>,
  objectUrls: ObjectUrlApi = URL,
) {
  let disposed = false
  const activeUrls = new Set<string>()

  return {
    async load(ids: readonly string[]) {
      const entries = await Promise.all(
        ids.map(async id => {
          const blob = await loadBlob(id)
          if (!blob || disposed) return [id, ''] as const

          const url = objectUrls.createObjectURL(blob)
          activeUrls.add(url)
          return [id, url] as const
        }),
      )

      return disposed ? {} : Object.fromEntries(entries)
    },

    dispose() {
      disposed = true
      activeUrls.forEach(url => objectUrls.revokeObjectURL(url))
      activeUrls.clear()
    },
  }
}
