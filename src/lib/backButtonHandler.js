import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

// Stack of active back button action callbacks (LIFO)
const backHandlers = []

/**
 * Register a back-button handler (e.g., to close a modal or drop-down).
 * Returns an unregister function to call on unmount or close.
 *
 * @param {() => boolean | void} fn Return true to consume the back event
 * @returns {() => void}
 */
export function registerBackHandler(fn) {
  if (typeof fn !== 'function') return () => {}
  backHandlers.push(fn)
  return () => {
    const idx = backHandlers.lastIndexOf(fn)
    if (idx !== -1) {
      backHandlers.splice(idx, 1)
    }
  }
}

/**
 * Initialize global Android hardware back button listener.
 * Guarded by Capacitor.isNativePlatform().
 *
 * @param {{ onBack?: () => boolean | void, onNavigateHome?: () => void }} [options]
 */
export function initHardwareBackButton(options = {}) {
  if (!Capacitor.isNativePlatform()) return () => {}

  let listener = null

  async function setupListener() {
    try {
      listener = await App.addListener('backButton', ({ canGoBack }) => {
        // 1. If any modal or sheet has registered a handler, close the topmost one
        if (backHandlers.length > 0) {
          const topHandler = backHandlers.pop()
          try {
            const consumed = topHandler()
            if (consumed !== false) return
          } catch (err) {
            console.warn('Error in back button handler:', err)
            return
          }
        }

        // 2. Custom onBack callback (allows App.jsx to handle route transitions)
        if (typeof options.onBack === 'function') {
          try {
            const handled = options.onBack()
            if (handled) return
          } catch (err) {
            console.warn('Error in options.onBack handler:', err)
          }
        }

        // 3. Fallback URL checking:
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          const hash = window.location.hash

          // Sub-tabs in feed (#my-recs, #shared) -> go back to /feed
          if (hash === '#/my-recs' || hash === '#my-recs' || hash === '#/shared' || hash === '#shared') {
            window.history.pushState(null, '', '/feed')
            window.dispatchEvent(new Event('popstate'))
            return
          }

          // If not on landing page (/), navigate back to landing page
          const isLanding = (path === '/' || path === '') && (!hash || hash === '#/' || hash === '#')
          if (!isLanding) {
            if (options.onNavigateHome) {
              options.onNavigateHome()
            } else {
              window.history.pushState(null, '', '/')
              window.dispatchEvent(new Event('popstate'))
            }
            return
          }
        }

        // 4. If on root landing page with nothing open, minimize/exit app
        App.exitApp()
      })
    } catch (err) {
      console.warn('Failed to attach native backButton listener:', err)
    }
  }

  setupListener()

  return () => {
    if (listener && typeof listener.remove === 'function') {
      listener.remove()
    }
  }
}
