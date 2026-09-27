import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, Search, Library, Heart, Clock, ListMusic,
  Disc3, Mic2, Download, Settings, ChevronLeft, ChevronRight,
  Plus, BarChart3, Shield
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { useLibraryStore } from '@/store/libraryStore';

const navSections = [
  {
    label: 'Main',
    items: [
      { icon: Home, label: 'Home', to: '/' },
      { icon: Compass, label: 'Explore', to: '/explore' },
      { icon: Search, label: 'Search', to: '/search' },
      { icon: Library, label: 'Library', to: '/library' },
    ],
  },
  {
    label: 'Your Music',
    items: [
      { icon: Heart, label: 'Liked Songs', to: '/liked' },
      { icon: Clock, label: 'Recently Played', to: '/recently-played' },
      { icon: BarChart3, label: 'Analytics', to: '/stats' },
      { icon: ListMusic, label: 'Playlists', to: '/playlists' },
      { icon: Disc3, label: 'Albums', to: '/albums' },
      { icon: Mic2, label: 'Artists', to: '/artists' },
      { icon: Download, label: 'Downloads', to: '/downloads' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { icon: Shield, label: 'Admin Portal', to: '/admin' },
      { icon: Settings, label: 'Settings', to: '/settings' },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { userPlaylists } = useLibraryStore();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="hidden md:flex flex-col h-full glass-dark border-r border-white/5 relative overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/5', sidebarCollapsed && 'justify-center px-0')}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg" style={{ boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V5l10-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="16" cy="16" r="3" />
          </svg>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-display font-bold text-[15px] tracking-[0.12em] text-white whitespace-nowrap"
            >
              MR music
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 no-scrollbar">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            {section.items.map(({ icon: Icon, label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all group relative',
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/20 to-pink-600/10 text-white border border-violet-500/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5',
                    sidebarCollapsed && 'justify-center px-0 mx-1'
                  )
                }
                title={sidebarCollapsed ? label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={cn('flex-shrink-0 transition-colors', isActive ? 'text-violet-400' : 'group-hover:text-white')} />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          className={cn('text-sm font-medium whitespace-nowrap', isActive ? 'text-white' : '')}
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute right-3 w-1.5 h-1.5 rounded-full bg-violet-400"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Quick Playlists section when expanded */}
        {!sidebarCollapsed && userPlaylists.length > 0 && (
          <div className="px-4 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Playlists
              </span>
              <Link to="/playlists" className="text-white/40 hover:text-white text-xs">
                <Plus size={13} />
              </Link>
            </div>
            <div className="space-y-1">
              {userPlaylists.slice(0, 5).map((pl) => (
                <Link
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  className="block text-xs text-white/50 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded-lg truncate transition-colors"
                >
                  {pl.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Collapse toggle button */}
      <div className="border-t border-white/5 p-3 flex justify-end">
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </motion.aside>
  );
}
