import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Lock, User, Sparkles, LogIn, ArrowRight,
  CheckCircle2, AlertCircle, Shield, Check, Music2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { genres } from '@/data/demo';
import { cn } from '@/utils/cn';

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    openAuthModal,
    loginWithEmail,
    signUpWithEmail,
    loginWithGoogle,
    loginAsDemoUser,
    sendPasswordReset,
  } = useAuthStore();

  const { addToast } = useUIStore();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Synthwave', 'Electronic']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setUsername('');
    setErrorMessage(null);
    setResetSent(false);
  };

  const handleClose = () => {
    resetForm();
    closeAuthModal();
  };

  const handleToggleGenre = (genreName: string) => {
    if (selectedGenres.includes(genreName)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((g) => g !== genreName));
      }
    } else {
      setSelectedGenres([...selectedGenres, genreName]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (authModalTab === 'login') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter both email and password');
        }
        await loginWithEmail(email.trim(), password);
        addToast('Welcome back to MR music!', 'success');
        handleClose();
      } else if (authModalTab === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!username.trim()) throw new Error('Please choose a username');
        if (!email.trim()) throw new Error('Please enter a valid email');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (password !== confirmPassword) throw new Error('Passwords do not match');

        await signUpWithEmail(name.trim(), username.trim(), email.trim(), password, selectedGenres);
        addToast('Account created successfully! Welcome to MR music!', 'success');
        handleClose();
      } else if (authModalTab === 'forgot_password') {
        if (!email.trim()) throw new Error('Please enter your email address');
        await sendPasswordReset(email.trim());
        setResetSent(true);
        addToast('Password reset link sent to your email!', 'info');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      addToast('Signed in with Google successfully!', 'success');
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = () => {
    loginAsDemoUser();
    addToast('Logged in as Demo User', 'info');
    handleClose();
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-md bg-[#0e0e1a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden my-8"
          >
            {/* Top Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header Icon & Brand */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
                <Music2 size={20} />
              </div>
              <div>
                <h3 className="font-display text-xl font-extrabold text-white">
                  {authModalTab === 'login' && 'Sign In to MR music'}
                  {authModalTab === 'signup' && 'Create Your Account'}
                  {authModalTab === 'forgot_password' && 'Reset Password'}
                </h3>
                <p className="text-xs text-white/40">
                  {authModalTab === 'login' && 'Access your personalized library and recommendations'}
                  {authModalTab === 'signup' && 'Join MR music for cloud synchronized streaming'}
                  {authModalTab === 'forgot_password' && 'We will send a recovery link to your email'}
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            {authModalTab !== 'forgot_password' && (
              <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/5 mb-6 text-xs font-semibold">
                <button
                  onClick={() => { setErrorMessage(null); openAuthModal('login'); }}
                  className={cn(
                    'flex-1 py-2 rounded-xl transition-all',
                    authModalTab === 'login'
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setErrorMessage(null); openAuthModal('signup'); }}
                  className={cn(
                    'flex-1 py-2 rounded-xl transition-all',
                    authModalTab === 'signup'
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs mb-4">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success reset banner */}
            {resetSent && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs mb-4">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>Reset email sent. Check your inbox to set a new password.</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {authModalTab === 'signup' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        placeholder="Alex Rivers"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-xs font-mono">@</span>
                      <input
                        type="text"
                        placeholder="alex_rivers"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              {authModalTab !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                      Password
                    </label>
                    {authModalTab === 'login' && (
                      <button
                        type="button"
                        onClick={() => openAuthModal('forgot_password')}
                        className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {authModalTab === 'signup' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Favorite Genres Selector */}
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-2">
                      Select Favorite Genres
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar p-1">
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
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>
                      {authModalTab === 'login' && 'Sign In'}
                      {authModalTab === 'signup' && 'Create Account'}
                      {authModalTab === 'forgot_password' && 'Send Recovery Email'}
                    </span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login if on forgot password */}
            {authModalTab === 'forgot_password' && (
              <button
                onClick={() => openAuthModal('login')}
                className="w-full text-center text-xs text-white/50 hover:text-white mt-4 transition-colors"
              >
                Back to Sign In
              </button>
            )}

            {/* Social & Alternative Auth */}
            {authModalTab !== 'forgot_password' && (
              <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
                {/* Google Sign-in button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Instant Demo User Login */}
                <button
                  onClick={handleDemoSignIn}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white/40 hover:text-violet-400 transition-colors"
                >
                  <Sparkles size={13} className="text-violet-400" />
                  <span>Try Instant Demo Mode</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
