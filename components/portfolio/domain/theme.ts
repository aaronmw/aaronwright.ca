export const TOP_SCREEN_COLOR = 'hsl(0 0% 100%)'
export const PROJECT_COLOR_START_HUE = 342
export const PROJECT_COLOR_SATURATION = 78
export const PROJECT_COLOR_LIGHTNESS = 54
export const PROJECT_COLOR_ACTIVE_LIGHTNESS = 95
export const PROJECT_COLOR_MIN_CONTRAST = 4.5

function buildProjectHues(projectCount: number) {
  const safeProjectCount = Math.max(1, projectCount)
  const hueStep = 360 / safeProjectCount

  return Array.from({ length: safeProjectCount }, (_, index) =>
    Math.round((PROJECT_COLOR_START_HUE + hueStep * index) % 360),
  )
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const normalizedHue = (((hue % 360) + 360) % 360) / 360
  const normalizedSaturation = saturation / 100
  const normalizedLightness = lightness / 100

  if (normalizedSaturation === 0) {
    const channel = Math.round(normalizedLightness * 255)
    return [channel, channel, channel] as const
  }

  const q =
    normalizedLightness < 0.5
      ? normalizedLightness * (1 + normalizedSaturation)
      : normalizedLightness +
        normalizedSaturation -
        normalizedLightness * normalizedSaturation
  const p = 2 * normalizedLightness - q
  const hueToChannel = (offset: number) => {
    let channelHue = normalizedHue + offset

    if (channelHue < 0) channelHue += 1
    if (channelHue > 1) channelHue -= 1
    if (channelHue < 1 / 6) return p + (q - p) * 6 * channelHue
    if (channelHue < 1 / 2) return q
    if (channelHue < 2 / 3) return p + (q - p) * (2 / 3 - channelHue) * 6
    return p
  }

  return [
    Math.round(hueToChannel(1 / 3) * 255),
    Math.round(hueToChannel(0) * 255),
    Math.round(hueToChannel(-1 / 3) * 255),
  ] as const
}

function toLinearChannel(channel: number) {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function getContrastAgainstBlack(
  hue: number,
  saturation: number,
  lightness: number,
) {
  const [red, green, blue] = hslToRgb(hue, saturation, lightness)
  const relativeLuminance =
    0.2126 * toLinearChannel(red) +
    0.7152 * toLinearChannel(green) +
    0.0722 * toLinearChannel(blue)

  return (relativeLuminance + 0.05) / 0.05
}

export function ensureContrastAgainstBlack(
  hue: number,
  saturation: number,
  lightness: number,
  minimumContrast: number,
) {
  if (getContrastAgainstBlack(hue, saturation, lightness) >= minimumContrast) {
    return lightness
  }

  let failingLightness = lightness
  let passingLightness = 100

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const candidateLightness = (failingLightness + passingLightness) / 2

    if (
      getContrastAgainstBlack(hue, saturation, candidateLightness) >=
      minimumContrast
    ) {
      passingLightness = candidateLightness
    } else {
      failingLightness = candidateLightness
    }
  }

  return Math.ceil(passingLightness * 100) / 100
}

export function buildProjectColors(projectCount: number) {
  return buildProjectHues(projectCount).map(hue => {
    const lightness = ensureContrastAgainstBlack(
      hue,
      PROJECT_COLOR_SATURATION,
      PROJECT_COLOR_LIGHTNESS,
      PROJECT_COLOR_MIN_CONTRAST,
    )

    return `hsl(${hue} ${PROJECT_COLOR_SATURATION}% ${lightness}%)`
  })
}

export function buildActiveProjectColors(projectCount: number) {
  return buildProjectHues(projectCount).map(hue => {
    return `hsl(${hue} ${PROJECT_COLOR_SATURATION}% ${PROJECT_COLOR_ACTIVE_LIGHTNESS}%)`
  })
}

export function buildActiveProjectColorFromHex(baseColor: string) {
  const hex = baseColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!hex) {
    throw new Error(`Expected a six-digit hex color, received "${baseColor}"`)
  }

  const [red, green, blue] = hex
    .slice(1)
    .map(channel => Number.parseInt(channel, 16) / 255)
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  const lightness = (maximum + minimum) / 2
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  let hue = 0
  if (delta !== 0) {
    if (maximum === red) {
      hue = 60 * (((green - blue) / delta) % 6)
    } else if (maximum === green) {
      hue = 60 * ((blue - red) / delta + 2)
    } else {
      hue = 60 * ((red - green) / delta + 4)
    }
  }

  const normalizedHue = hue < 0 ? hue + 360 : hue
  const format = (value: number) =>
    Number.parseFloat(value.toFixed(2)).toString()

  return `hsl(${format(normalizedHue)} ${format(saturation * 100)}% ${PROJECT_COLOR_ACTIVE_LIGHTNESS}%)`
}

export function getProjectColor(colors: string[], projectIndex: number) {
  const normalizedIndex =
    ((projectIndex % colors.length) + colors.length) % colors.length
  return colors[normalizedIndex]
}
