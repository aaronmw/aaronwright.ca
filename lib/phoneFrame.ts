// Shared outline of the phone baked into the 442 × 906 NextPhrase recording.
export const PHONE_FRAME_SIZE = { width: 442, height: 906 } as const
export const PHONE_FRAME_PATH =
  'M82 0H360C403 0 438 35 438 78V828C438 871 403 906 360 906H82C39 906 4 871 4 828V78C4 35 39 0 82 0Z'
export const PHONE_FRAME_PATH_SCALE = 'scale(0.002262443439 0.001103752759)'

export function phoneFrameSvg(imageUrl: string) {
  const { width, height } = PHONE_FRAME_SIZE
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="phone-frame"><path d="${PHONE_FRAME_PATH}"/></clipPath></defs><image width="${width}" height="${height}" xlink:href="${imageUrl}" clip-path="url(#phone-frame)"/></svg>`
}
