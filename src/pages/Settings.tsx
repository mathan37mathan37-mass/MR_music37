import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Disc,
  Bell,
  Shield,
  User,
  Moon,
  Sun,
  Monitor,
  Check,
  Sparkles,
  LogIn,
  LogOut,
  Camera,
  Save,
  Edit3,
  Trash2,
  Key,
  Mail,
  AlertTriangle,
  ChevronRight,
  Sliders,
  Volume2,
  Zap,
  Radio,
  Clock,
  Eye,
  ListMusic,
  Share2,
  Activity,
  Layers,
  Info
} from 'lucide-react';
import { useSettingsStore, ACCENT_COLORS, type Theme, type AccentColor, type AudioQuality } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { uploadMediaFile } from '@/services/storageService';
import { genres, artists as allArtists } from '@/data/demo';
import { cn } from '@/utils/cn';

type SettingsTab = 'appearance' | 'playback' | 'notifications' | 'privacy' | 'account';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // Stores
  const {
    theme,
    accentColor,
    compactMode,
    audioQuality,
    autoplay,
    crossfade,
    crossfadeDuration,
    gaplessPlayback,
    normalizeVolume,
    notifications,
    notifyNewReleases,
    notifyRecommendations,
    notifyPlaylistUpdates,
    publicProfile,
    publicPlaylists,
    shareListeningActivity,
    showRecentlyPlayed,
    setTheme,
    setAccentColor,
    setSetting,
  } = useSettingsStore();

  const {
    user,
    openAuthModal,
    logout,
    deleteAccount,
    sendPasswordReset,
    updateProfile,
    updatePreferences,
  } = useAuthStore();

  const { addToast } = useUIStore();

  // Account tab state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(user?.favoriteGenres || ['Synthwave', 'Electronic']);
  const [selectedArtists, setSelectedArtists] = useState<string[]>(user?.favoriteArtists || ['Luna Eclipse']);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync setting helper
  const handleSettingChange = (key: any, val: any) => {
    setSetting(key, val);
    if (user) {
      updatePreferences({ [key]: val } as any);
    }
  };

  // Avatar Upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const downloadUrl = await uploadMediaFile(`avatars/${user?.uid || 'guest'}`, file);
      await updateProfile({ photoURL: downloadUrl });
      addToast('Profile picture updated successfully!', 'success');
    } catch {
      addToast('Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    await updateProfile({
      displayName: displayName.trim(),
      username: username.trim().toLowerCase().replace(/\s+/g, '_'),
      favoriteGenres: selectedGenres,
      favoriteArtists: selectedArtists,
    });

    setIsEditingProfile(false);
    addToast('Profile updated successfully', 'success');
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      addToast('No email associated with account', 'error');
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordReset(user.email);
      addToast(`Password reset link sent to ${user.email}`, 'success');
    } catch {
      addToast('Failed to send password reset email', 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      addToast('Account deleted successfully', 'info');
    } catch {
      addToast('Failed to delete account', 'error');
    }
  };

  const handleToggleGenre = (gName: string) => {
    if (selectedGenres.includes(gName)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((g) => g !== gName));
      }
    } else {
      setSelectedGenres([...selectedGenres, gName]);
    }
  };

  const handleToggleArtist = (aName: string) => {
    if (selectedArtists.includes(aName)) {
      setSelectedArtists(selectedArtists.filter((a) => a !== aName));
    } else {
      setSelectedArtists([...selectedArtists, aName]);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} />, desc: 'Theme, colors & layout' },
    { id: 'playback', label: 'Playback', icon: <Disc size={18} />, desc: 'Sound, crossfade & quality' },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, desc: 'Alerts & updates' },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={18} />, desc: 'Visibility & profile data' },
    { id: 'account', label: 'Account', icon: <User size={18} />, desc: 'Profile, security & session' },
  ];

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-8 min-h-screen">
      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-white text-3xl tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Customize playback audio, visual appearance, privacy, and account security.
          </p>
        </div>

        {user ? (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 w-fit">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
              ) : (
                (user.displayName || user.email || 'U')[0].toUpperCase()
              )}
            </div>
            <div className="text-left pr-2">
              <p className="text-xs font-semibold text-white leading-none">{user.displayName}</p>
              <p className="text-[10px] text-white/40 mt-0.5 leading-none">@{user.username}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all w-fit"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/8 backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-semibold transition-all',
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="settingsTabIndicator"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 shadow-md shadow-violet-600/30"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              <span className="sm:hidden text-[11px] relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: APPEARANCE                                                  */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'appearance' && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Theme Mode */}
              <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8 space-y-5">
                <div>
                  <h3 className="font-display font-bold text-white text-lg">Theme Mode</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Select your preferred interface brightness and theme tone.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    { id: 'dark', label: 'Dark Mode', icon: <Moon size={20} />, desc: 'Deep immersive obsidian tone' },
                    { id: 'light', label: 'Light Mode', icon: <Sun size={20} />, desc: 'Clean high-contrast daylight' },
                    { id: 'system', label: 'System Sync', icon: <Monitor size={20} />, desc: 'Follows your operating system' },
                  ] as const).map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          if (user) updatePreferences({ theme: t.id });
                        }}
                        className={cn(
                          'p-4 rounded-2xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden',
                          isSelected
                            ? 'bg-violet-600/15 border-violet-500 shadow-lg shadow-violet-600/20'
                            : 'bg-white/5 border-white/8 hover:bg-white/8 hover:border-white/15'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className={cn('p-2.5 rounded-xl', isSelected ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/60')}>
                            {t.icon}
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="mt-4">
                          <p className="font-semibold text-white text-sm">{t.label}</p>
                          <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color */}
              <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8 space-y-5">
                <div>
                  <h3 className="font-display font-bold text-white text-lg">Accent Color</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Personalize interactive buttons, badges, glows, and waveform visuals.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((col) => {
                    const info = ACCENT_COLORS[col];
                    const isSelected = accentColor === col;
                    return (
                      <button
                        key={col}
                        onClick={() => {
                          setAccentColor(col);
                          if (user) updatePreferences({ accentColor: col });
                        }}
                        className={cn(
                          'p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left',
                          isSelected
                            ? 'bg-white/10 border-white/30 shadow-md'
                            : 'bg-white/5 border-white/8 hover:bg-white/8'
                        )}
                      >
                        <div
                          className="w-7 h-7 rounded-full shadow-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: info.hex, boxShadow: `0 0 12px ${info.hex}60` }}
                        >
                          {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="font-semibold text-white text-xs">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compact Mode */}
              <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-violet-400" />
                    <h3 className="font-display font-bold text-white text-base">Compact Mode</h3>
                  </div>
                  <p className="text-xs text-white/50 max-w-md">
                    Reduce vertical padding and spacing in track tables, queue drawers, and album views to fit more music on screen.
                  </p>
                </div>

                <button
                  onClick={() => handleSettingChange('compactMode', !compactMode)}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                    compactMode ? 'bg-violet-600' : 'bg-white/10'
                  )}
                >
                  <motion.div
                    animate={{ x: compactMode ? 26 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                  />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: PLAYBACK                                                    */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'playback' && (
            <motion.div
              key="playback"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Audio Quality */}
              <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8 space-y-5">
                <div>
                  <h3 className="font-display font-bold text-white text-lg">Streaming Audio Quality</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Adjust compression rate and bitrate according to your internet bandwidth.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {([
                    { id: 'low', label: 'Low', bitrate: '96 kbps', desc: 'Saves mobile data' },
                    { id: 'normal', label: 'Normal', bitrate: '160 kbps', desc: 'Standard clarity' },
                    { id: 'high', label: 'High', bitrate: '320 kbps', desc: 'Rich crystal sound' },
                    { id: 'lossless', label: 'Lossless', bitrate: 'FLAC 24-bit', desc: 'Audiophile studio master' },
                  ] as const).map((q) => {
                    const isSelected = audioQuality === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleSettingChange('audioQuality', q.id)}
                        className={cn(
                          'p-4 rounded-2xl border text-left transition-all flex flex-col justify-between',
                          isSelected
                            ? 'bg-violet-600/15 border-violet-500 shadow-lg shadow-violet-600/20'
                            : 'bg-white/5 border-white/8 hover:bg-white/8'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md', isSelected ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60')}>
                            {q.bitrate}
                          </span>
                          {isSelected && <Check size={14} className="text-violet-400" />}
                        </div>
                        <div className="mt-4">
                          <p className="font-bold text-white text-sm">{q.label}</p>
                          <p className="text-[11px] text-white/40 mt-0.5">{q.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Autoplay & Gapless */}
              <div className="glass rounded-3xl border border-white/8 divide-y divide-white/5 overflow-hidden">
                {/* Autoplay */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Radio size={18} className="text-pink-400" />
                      <h4 className="font-semibold text-white text-sm">Autoplay Similar Music</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      When your current queue finishes, MR music will keep streaming related recommendations.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('autoplay', !autoplay)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      autoplay ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: autoplay ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Gapless Playback */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap size={18} className="text-cyan-400" />
                      <h4 className="font-semibold text-white text-sm">Gapless Playback</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Eliminate brief pauses between tracks for a seamless live album or continuous DJ mix experience.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('gaplessPlayback', !gaplessPlayback)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      gaplessPlayback ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: gaplessPlayback ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Volume Normalization */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Volume2 size={18} className="text-green-400" />
                      <h4 className="font-semibold text-white text-sm">Volume Normalization</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Balance dynamic gain across quiet and loud tracks so you don't need to constantly adjust volume.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('normalizeVolume', !normalizeVolume)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      normalizeVolume ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: normalizeVolume ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>
              </div>

              {/* Crossfade */}
              <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sliders size={18} className="text-violet-400" />
                      <h4 className="font-semibold text-white text-sm">Crossfade Tracks</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Fade out the ending song while gently fading in the next track.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('crossfade', !crossfade)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      crossfade ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: crossfade ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {crossfade && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-4 border-t border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60 font-medium">Crossfade Transition Duration</span>
                      <span className="font-bold text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20">
                        {crossfadeDuration}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={1}
                      value={crossfadeDuration}
                      onChange={(e) => handleSettingChange('crossfadeDuration', Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>1 sec</span>
                      <span>6 sec</span>
                      <span>12 sec</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: NOTIFICATIONS                                               */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Master Notification Toggle */}
              <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell size={18} className="text-violet-400" />
                    <h3 className="font-display font-bold text-white text-base">Push Notifications</h3>
                  </div>
                  <p className="text-xs text-white/50 max-w-md">
                    Receive timely updates about new songs, playlist updates, and recommendations on your device.
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('notifications', !notifications)}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                    notifications ? 'bg-violet-600' : 'bg-white/10'
                  )}
                >
                  <motion.div
                    animate={{ x: notifications ? 26 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              {/* Granular Notification Channels */}
              <div className={cn('glass rounded-3xl border border-white/8 divide-y divide-white/5 overflow-hidden transition-opacity', !notifications && 'opacity-40 pointer-events-none')}>
                {/* New Releases */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-pink-400" />
                      <h4 className="font-semibold text-white text-sm">New Releases</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Get notified when artists you follow drop new singles, EPs, or full-length albums.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('notifyNewReleases', !notifyNewReleases)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      notifyNewReleases ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: notifyNewReleases ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Recommendations */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-cyan-400" />
                      <h4 className="font-semibold text-white text-sm">Personalized Recommendations</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Weekly radar discoveries and curated collections tailored to your favorite genres.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('notifyRecommendations', !notifyRecommendations)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      notifyRecommendations ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: notifyRecommendations ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Playlist Updates */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ListMusic size={16} className="text-orange-400" />
                      <h4 className="font-semibold text-white text-sm">Playlist Updates</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Alerts when collaborative playlist members add fresh tracks or reorganize track orders.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('notifyPlaylistUpdates', !notifyPlaylistUpdates)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      notifyPlaylistUpdates ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: notifyPlaylistUpdates ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: PRIVACY                                                     */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="glass rounded-3xl border border-white/8 divide-y divide-white/5 overflow-hidden">
                {/* Public Profile */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Eye size={18} className="text-violet-400" />
                      <h4 className="font-semibold text-white text-sm">Public Profile</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Allow other listeners to find and browse your profile, avatar, and musical taste badges.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('publicProfile', !publicProfile)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      publicProfile ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: publicProfile ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Public Playlists */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Share2 size={18} className="text-pink-400" />
                      <h4 className="font-semibold text-white text-sm">Public Playlists</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Display your public playlists in community search and enable sharable link embeds.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('publicPlaylists', !publicPlaylists)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      publicPlaylists ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: publicPlaylists ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Listening Activity */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-cyan-400" />
                      <h4 className="font-semibold text-white text-sm">Live Listening Activity</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Broadcast what track you are currently streaming to your followers in real-time.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('shareListeningActivity', !shareListeningActivity)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      shareListeningActivity ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: shareListeningActivity ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                {/* Recently Played Visibility */}
                <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-orange-400" />
                      <h4 className="font-semibold text-white text-sm">Recently Played Visibility</h4>
                    </div>
                    <p className="text-xs text-white/50 max-w-md">
                      Display your recently played songs on your profile page for visiting friends to see.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('showRecentlyPlayed', !showRecentlyPlayed)}
                    className={cn(
                      'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
                      showRecentlyPlayed ? 'bg-violet-600' : 'bg-white/10'
                    )}
                  >
                    <motion.div
                      animate={{ x: showRecentlyPlayed ? 26 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: ACCOUNT                                                     */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {user ? (
                <>
                  {/* Profile Card */}
                  <div className="glass rounded-3xl border border-white/10 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-violet-600/15 filter blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                      {/* Avatar */}
                      <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="Change avatar image">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'Profile'}
                            className="w-20 h-20 rounded-full object-cover shadow-xl ring-2 ring-violet-500/50 group-hover:opacity-80 transition-opacity"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl group-hover:opacity-80 transition-opacity">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Camera size={20} />
                        </div>
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                            Uploading...
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-center sm:text-left min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h2 className="font-display font-extrabold text-white text-2xl tracking-tight">
                              {user.displayName}
                            </h2>
                            <p className="text-xs text-white/50 mt-0.5">
                              @{user.username} • {user.email}
                            </p>
                          </div>

                          <button
                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all self-center sm:self-start"
                          >
                            <Edit3 size={13} />
                            <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
                          </button>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                          <span className="px-3 py-1 rounded-full bg-violet-600/20 text-violet-300 text-xs font-semibold border border-violet-500/30 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-violet-400" />
                            <span>Cloud Synchronized</span>
                          </span>
                          <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/5">
                            Firestore Connected
                          </span>
                        </div>

                        {/* Favorite Genres & Artists */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                          <span className="text-[11px] font-semibold text-white/40 uppercase mr-1">Genres:</span>
                          {user.favoriteGenres?.map((g) => (
                            <span key={g} className="px-2.5 py-0.5 rounded-lg bg-pink-500/10 text-pink-300 text-[11px] font-medium border border-pink-500/20">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Edit Profile Drawer */}
                    <AnimatePresence>
                      {isEditingProfile && (
                        <motion.form
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          onSubmit={handleSaveProfile}
                          className="mt-6 pt-6 border-t border-white/10 space-y-4"
                        >
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Edit Profile Details
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                                Display Name
                              </label>
                              <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                                Username
                              </label>
                              <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                              />
                            </div>
                          </div>

                          {/* Genre Selection */}
                          <div>
                            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
                              Favorite Genres
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {genres.map((g) => {
                                const isSelected = selectedGenres.includes(g.name);
                                return (
                                  <button
                                    type="button"
                                    key={g.id}
                                    onClick={() => handleToggleGenre(g.name)}
                                    className={cn(
                                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1',
                                      isSelected
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                                    )}
                                  >
                                    {isSelected && <Check size={11} />}
                                    <span>{g.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Artist Selection */}
                          <div>
                            <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
                              Favorite Artists
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {allArtists.map((a) => {
                                const isSelected = selectedArtists.includes(a.name);
                                return (
                                  <button
                                    type="button"
                                    key={a.id}
                                    onClick={() => handleToggleArtist(a.name)}
                                    className={cn(
                                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1',
                                      isSelected
                                        ? 'bg-pink-600 text-white'
                                        : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                                    )}
                                  >
                                    {isSelected && <Check size={11} />}
                                    <span>{a.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingProfile(false)}
                              className="px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:text-white text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30"
                            >
                              <Save size={14} />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Email & Password Security Controls */}
                  <div className="glass rounded-3xl border border-white/8 divide-y divide-white/5 overflow-hidden">
                    {/* Email */}
                    <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail size={18} className="text-violet-400" />
                          <h4 className="font-semibold text-white text-sm">Account Email</h4>
                        </div>
                        <p className="text-xs text-white/50">{user.email}</p>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        Active
                      </span>
                    </div>

                    {/* Password */}
                    <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Key size={18} className="text-pink-400" />
                          <h4 className="font-semibold text-white text-sm">Security & Password</h4>
                        </div>
                        <p className="text-xs text-white/50">
                          Send a password reset link to your registered email address.
                        </p>
                      </div>
                      <button
                        onClick={handlePasswordReset}
                        disabled={isSendingReset}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors flex-shrink-0"
                      >
                        {isSendingReset ? 'Sending...' : 'Reset Password'}
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="p-6 sm:p-8 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <LogOut size={18} className="text-amber-400" />
                          <h4 className="font-semibold text-white text-sm">Log Out</h4>
                        </div>
                        <p className="text-xs text-white/50">
                          End your current session across this browser.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await logout();
                          addToast('Logged out of MR music', 'info');
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors flex-shrink-0"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone: Delete Account */}
                  <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8 space-y-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle size={18} />
                      <h4 className="font-bold text-sm">Danger Zone</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white text-sm">Delete Account</p>
                        <p className="text-xs text-white/40 mt-0.5 max-w-md">
                          Permanently delete your profile, playlists, and synced listening history. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-colors flex-shrink-0 w-fit"
                      >
                        <Trash2 size={14} />
                        <span>Delete Account</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Guest Mode */
                <div className="glass rounded-3xl border border-white/10 p-8 text-center space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center mx-auto shadow-xl shadow-violet-600/30">
                    <User size={30} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-white text-2xl">Guest Session</h3>
                    <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
                      Sign in or create an account to personalize your profile, synchronize favorite tracks, and preserve playlist history across devices.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all"
                    >
                      Create Free Account
                    </button>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12121e] border border-red-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Are you absolutely sure?</h4>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  This will immediately remove your profile, created playlists, and all synced data from our cloud servers. This cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccountConfirm}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 transition-colors"
                >
                  Yes, Delete My Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
