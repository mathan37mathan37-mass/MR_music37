import { cn } from '@/utils/cn';

interface LoadingSkeletonProps {
  variant?: 'card' | 'row' | 'artist' | 'text';
  count?: number;
  className?: string;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton rounded-xl aspect-square w-full" />
      <div className="skeleton rounded-md h-4 w-3/4" />
      <div className="skeleton rounded-md h-3 w-1/2" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="skeleton rounded-lg w-12 h-12 flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton rounded-md h-4 w-2/3" />
        <div className="skeleton rounded-md h-3 w-1/3" />
      </div>
      <div className="skeleton rounded-md h-3 w-10" />
    </div>
  );
}

function ArtistSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="skeleton rounded-full w-24 h-24" />
      <div className="skeleton rounded-md h-4 w-20" />
      <div className="skeleton rounded-md h-3 w-16" />
    </div>
  );
}

function TextSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="skeleton rounded-md h-5 w-full" />
      <div className="skeleton rounded-md h-4 w-4/5" />
      <div className="skeleton rounded-md h-4 w-3/5" />
    </div>
  );
}

const variants = { card: CardSkeleton, row: RowSkeleton, artist: ArtistSkeleton, text: TextSkeleton };

export function LoadingSkeleton({ variant = 'card', count = 1, className }: LoadingSkeletonProps) {
  const Component = variants[variant];
  return (
    <div className={cn('contents', className)}>
      {Array.from({ length: count }).map((_, i) => <Component key={i} />)}
    </div>
  );
}
