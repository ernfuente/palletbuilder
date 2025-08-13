// Debounced state updater for performance
export function createDebouncedUpdater<T>(setter: (value: T) => void, delay = 300) {
  let timeoutId: NodeJS.Timeout | null = null

  return (value: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      setter(value)
      timeoutId = null
    }, delay)
  }
}

// Resource preloader for critical assets
export function preloadCriticalResources() {
  if (typeof window === "undefined") return

  // Preload critical CSS and fonts
  const criticalResources = [
    // Add any critical CSS or font URLs here
  ]

  criticalResources.forEach((url) => {
    const link = document.createElement("link")
    link.rel = "preload"
    link.href = url
    link.as = url.endsWith(".css") ? "style" : "font"
    if (link.as === "font") {
      link.crossOrigin = "anonymous"
    }
    document.head.appendChild(link)
  })
}

// Memory cleanup utility
export function createCleanupManager() {
  const cleanupFunctions = new Set<() => void>()

  return {
    add: (cleanup: () => void) => {
      cleanupFunctions.add(cleanup)
    },
    cleanup: () => {
      cleanupFunctions.forEach((fn) => {
        try {
          fn()
        } catch (error) {
          console.warn("Cleanup function failed:", error)
        }
      })
      cleanupFunctions.clear()
    },
  }
}
