import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Share2, Copy, Check, Send, Globe, Music, ListMusic
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { Track, Playlist } from '@/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  track?: Track | null;
  playlist?: Playlist | null;
}

export function ShareModal({ isOpen, onClose, track, playlist }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useUIStore();

  const isSharingTrack = Boolean(track);
  const title = isSharingTrack ? track?.title : playlist?.title;
  const subtitle = isSharingTrack ? track?.artist : `${playlist?.tracks.length || 0} tracks`;
  const artwork = isSharingTrack ? track?.coverUrl : playlist?.coverUrl;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    addToast('Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'MR music',
          text: `Listen to ${title} on MR music!`,
          url: shareUrl,
        });
        addToast('Shared successfully', 'success');
        onClose();
      } catch {
        // User cancelled or failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'whatsapp' | 'telegram') => {
    const text = encodeURIComponent(`Listen to "${title}" on MR music: `);
    const url = encodeURIComponent(shareUrl);
    let link = '';

    if (platform === 'twitter') {
      link = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    } else if (platform === 'whatsapp') {
      link = `https://api.whatsapp.com/send?text=${text}%20${url}`;
    } else if (platform === 'telegram') {
      link = `https://t.me/share/url?url=${url}&text=${text}`;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[#101020] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5 text-white">
              <Share2 size={18} className="text-violet-400" />
              <h3 className="font-semibold text-base">
                {isSharingTrack ? 'Share Song' : 'Share Playlist'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Item Preview Card */}
          <div className="flex items-center gap-3.5 p-3.5 mt-5 rounded-2xl bg-white/5 border border-white/5">
            {artwork ? (
              <img src={artwork} alt="" className="w-14 h-14 rounded-xl object-cover shadow" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-violet-600/30 flex items-center justify-center text-violet-300">
                {isSharingTrack ? <Music size={24} /> : <ListMusic size={24} />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white truncate">{title}</h4>
              <p className="text-xs text-white/50 truncate mt-0.5">{subtitle}</p>
              <span className="text-[10px] text-violet-400 font-medium mt-1 inline-block">MR music Stream</span>
            </div>
          </div>

          {/* Share Actions */}
          <div className="space-y-4 mt-6">
            {/* Copy Link Input Bar */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-xs text-white/60 px-3 py-1 flex-1 outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow transition-all flex-shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Native Web Share Button (if supported) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleWebShare}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
              >
                <Globe size={15} className="text-pink-400" />
                <span>Open System Share Sheet</span>
              </button>
            )}

            {/* Social Share Shortcuts */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2.5">
                Share Directly To
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSocialShare('twitter')}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-xs font-medium transition-colors"
                >
                  <Send size={13} className="text-sky-400" />
                  <span>X (Twitter)</span>
                </button>
                <button
                  onClick={() => handleSocialShare('whatsapp')}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-xs font-medium transition-colors"
                >
                  <Send size={13} className="text-emerald-400" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => handleSocialShare('telegram')}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-xs font-medium transition-colors"
                >
                  <Send size={13} className="text-cyan-400" />
                  <span>Telegram</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
