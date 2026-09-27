import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SectionHeaderProps {
  title: string;
  description?: string;
  seeAllHref?: string;
  className?: string;
  titleClassName?: string;
}

export function SectionHeader({ title, description, seeAllHref, className, titleClassName }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between mb-5', className)}>
      <div>
        <h2 className={cn('text-xl font-bold text-white font-display tracking-tight', titleClassName)}>{title}</h2>
        {description && <p className="text-sm text-white/50 mt-0.5">{description}</p>}
      </div>
      {seeAllHref && (
        <Link
          to={seeAllHref}
          className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors group"
        >
          See all
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}
