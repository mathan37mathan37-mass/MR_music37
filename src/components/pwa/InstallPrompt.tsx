import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'melodix-pwa-dismissed';

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Previously dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Small delay so it doesn't pop instantly
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-28 left-4 right-4 z-[200] sm:left-auto sm:right-6 sm:w-80"
          role="dialog"
          aria-label="Install MR music app"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60"
            style={{ background: 'linear-gradient(135deg, rgba(18,8,42,0.97) 0%, rgba(13,13,20,0.97) 100%)', backdropFilter: 'blur(20px)' }}>

            {/* Accent glow */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)' }} />

            <div className="relative p-4">
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                id="pwa-dismiss-btn"
                className="absolute top-3 right-3 p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>

              <div className="flex items-start gap-3 pr-6">
                {/* Icon */}
                <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                  <Smartphone size={20} className="text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm leading-snug">Install MR music</p>
                  <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                    Get the full native music experience — offline access, faster loads.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3 pl-14">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/8 transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  id="pwa-install-btn"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}
                >
                  <Download size={13} />
                  Install
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
