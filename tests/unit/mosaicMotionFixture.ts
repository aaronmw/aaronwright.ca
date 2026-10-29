import type { RectangleInkElements } from '@/components/mosaic/rectangleMotion'

/** Attribute targets exercise GSAP's actual AttrPlugin without a browser renderer. */
export class MotionElement extends EventTarget {
  attrs: Record<string, string> = {}
  dataset: Record<string, string> = {}
  opacity = 0
  style = {
    opacity: '',
    values: {} as Record<string, string>,
    setProperty(name: string, value: string) {
      this.values[name] = value
    },
    removeProperty(name: string) {
      delete this.values[name]
    },
  }
  constructor(public bounds = { left: 30, top: 700, width: 480, height: 240 }) {
    super()
  }
  getBoundingClientRect = () => ({
    ...this.bounds,
    right: this.bounds.left + this.bounds.width,
    bottom: this.bounds.top + this.bounds.height,
  })
  querySelectorAll = () => []
  getAttribute = (name: string) => this.attrs[name] ?? null
  setAttribute = (name: string, value: string) => {
    this.attrs[name] = String(value)
  }
  removeAttribute = (name: string) => {
    delete this.attrs[name]
  }
}

export function motionInk() {
  return {
    svg: new MotionElement(),
    origin: new MotionElement(),
    travel: new MotionElement(),
    shape: new MotionElement(),
    paint: new MotionElement(),
    stroke: new MotionElement(),
    edges: Array.from({ length: 4 }, () => new MotionElement()),
  } as unknown as RectangleInkElements
}
