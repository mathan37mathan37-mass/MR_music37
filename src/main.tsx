import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Register Service Worker ────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('./sw.js', window.location.href).toString();

    navigator.serviceWorker
      .register(swUrl, { scope: './' })
      .then((registration) => {
        console.log('[Melodix SW] Registered:', registration.scope);
      })
      .catch((err) => {
        console.warn('[Melodix SW] Registration failed:', err);
      });
  });
}
