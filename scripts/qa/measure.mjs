// Runs in the page, before application JavaScript. These are lab diagnostics,
// not field INP, GPU frame rate, or a claim to emulate physical phone hardware.
export function installMeasurements() {
  const required = ['longtask', 'long-animation-frame']
  for (const type of required) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) {
      throw new Error(`Required performance observer unavailable: ${type}`)
    }
  }
  let start = 0
  let previousFrame
  let gaps = []
  let tasks = []
  let frames = []
  const observers = required.map((type, index) => {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.startTime >= start)
          (index === 0 ? tasks : frames).push(entry.duration)
      }
    })
    observer.observe({ type, buffered: true })
    return observer
  })
  const sample = time => {
    if (previousFrame !== undefined) gaps.push(time - previousFrame)
    previousFrame = time
    requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
  window.__qa = {
    begin() {
      observers.forEach(observer => observer.takeRecords())
      start = performance.now()
      previousFrame = undefined
      gaps = []
      tasks = []
      frames = []
    },
    finish() {
      observers.forEach((observer, index) => {
        for (const entry of observer.takeRecords()) {
          if (entry.startTime >= start)
            (index === 0 ? tasks : frames).push(entry.duration)
        }
      })
      if (gaps.length < 2)
        throw new Error('Too few animation frames to measure')
      const sorted = [...gaps].sort((a, b) => a - b)
      return {
        durationMs: performance.now() - start,
        maxLongTaskMs: Math.max(0, ...tasks),
        maxLongFrameMs: Math.max(0, ...frames),
        frameGapP95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
        framesSampled: gaps.length,
        frameGapsOver50Ms: gaps.filter(value => value > 50).length,
      }
    },
  }
}
