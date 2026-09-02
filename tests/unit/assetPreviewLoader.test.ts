import { describe, expect, it, vi } from 'vitest'
import { createAssetPreviewLoader } from '../../components/case-study-intake/assetPreviewLoader'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => {
    resolve = next
  })
  return { promise, resolve }
}

describe('asset preview loader', () => {
  it('does not create an object URL when a blob resolves after disposal', async () => {
    const blob = deferred<Blob | undefined>()
    const objectUrls = {
      createObjectURL: vi.fn(() => 'blob:late'),
      revokeObjectURL: vi.fn(),
    }
    const loader = createAssetPreviewLoader(() => blob.promise, objectUrls)
    const result = loader.load(['asset'])

    loader.dispose()
    blob.resolve(new Blob(['preview']))

    await expect(result).resolves.toEqual({})
    expect(objectUrls.createObjectURL).not.toHaveBeenCalled()
    expect(objectUrls.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('revokes every active object URL on disposal', async () => {
    const objectUrls = {
      createObjectURL: vi.fn(() => 'blob:active'),
      revokeObjectURL: vi.fn(),
    }
    const loader = createAssetPreviewLoader(
      async () => new Blob(['preview']),
      objectUrls,
    )

    await expect(loader.load(['asset'])).resolves.toEqual({
      asset: 'blob:active',
    })
    loader.dispose()

    expect(objectUrls.revokeObjectURL).toHaveBeenCalledWith('blob:active')
  })
})
