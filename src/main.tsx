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
    // Use absolute paths so SW registers correctly even from /auth/callback
    const swUrl = `${window.location.origin}/sw.js`;

    navigator.serviceWorker
      .register(swUrl, { scope: '/' })
      .then((registration) => {
        console.log('[Melodix SW] Registered:', registration.scope);
      })
      .catch((err) => {
        console.warn('[Melodix SW] Registration failed:', err);
      });
  });
}

