import { NavLink } from 'react-router-dom';
import { Home, Search, Library, BarChart3, User } from 'lucide-react';
import { cn } from '@/utils/cn';

const navItems = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Search, label: 'Search', to: '/search' },
  { icon: BarChart3, label: 'Analytics', to: '/stats' },
  { icon: Library, label: 'Library', to: '/library' },
  { icon: User, label: 'Profile', to: '/settings' },
];

export function MobileNavigation() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-white/5 pb-safe">
      <div className="flex items-stretch">
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all',
                isActive ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('p-1.5 rounded-xl transition-all', isActive && 'bg-violet-500/15')}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
