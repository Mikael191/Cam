export type Throttled<T extends (...args: never[]) => void> = ((...args: Parameters<T>) => void) & {
  cancel: () => void
  flush: () => void
}

export const throttle = <T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): Throttled<T> => {
  let lastTime = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const invoke = (time: number) => {
    lastTime = time
    if (lastArgs) {
      fn(...lastArgs)
      lastArgs = null
    }
  }

  const throttled = ((...args: Parameters<T>) => {
    const now = performance.now()
    const remaining = waitMs - (now - lastTime)
    lastArgs = args

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      invoke(now)
      return
    }

    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        timeoutId = null
        invoke(performance.now())
      }, remaining)
    }
  }) as Throttled<T>

  throttled.cancel = () => {
    if (!timeoutId) {
      return
    }
    clearTimeout(timeoutId)
    timeoutId = null
    lastArgs = null
  }

  throttled.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    invoke(performance.now())
  }

  return throttled
}
