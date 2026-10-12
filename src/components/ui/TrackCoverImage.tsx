import { useImageWithRetry } from '@/hooks/useImageWithRetry';
import { DEFAULT_MR_MUSIC_COVER } from '@/services/artworkService';

interface TrackCoverImageProps {
  src: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
}

export function TrackCoverImage({
  src,
  alt = '',
  className = 'w-full h-full object-cover',
  fallbackSrc = DEFAULT_MR_MUSIC_COVER,
}: TrackCoverImageProps) {
  const { src: activeSrc, onError } = useImageWithRetry({ src, fallbackSrc });

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={onError}
      className={className}
    />
  );
}
