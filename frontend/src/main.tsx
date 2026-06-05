import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

document.documentElement.classList.remove('dark');
localStorage.removeItem('theme-storage');

// Apply accessibility preferences on startup
;(function applyA11yPrefs() {
  const root = document.documentElement;
  const map: [string, string][] = [
    ['access-large-text',    'a11y-large-text'],
    ['access-reduce-motion', 'a11y-reduce-motion'],
    ['access-calm-mode',     'a11y-calm'],
    ['access-high-contrast', 'a11y-high-contrast'],
    ['access-keyboard-focus','a11y-keyboard-focus'],
  ];
  map.forEach(([key, cls]) => {
    if (localStorage.getItem(key) === 'true') root.classList.add(cls);
    else root.classList.remove(cls);
  });
})()

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD || localStorage.getItem('enable-sw-dev') === 'true') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().catch(() => {})
      })
    })

    if ('caches' in window) {
      window.caches.keys().then((keys) => {
        keys.forEach((key) => {
          window.caches.delete(key).catch(() => {})
        })
      })
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
