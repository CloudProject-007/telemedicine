import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

interface MediaViewProps {
  stream: MediaStream | null;
  label: string;
  /** Mute your own preview, or you will hear yourself. */
  muted?: boolean;
  /** Mirror your own preview so it behaves like a mirror. */
  mirrored?: boolean;
  className?: string;
}

export function MediaView({
  stream,
  label,
  muted = false,
  mirrored = false,
  className,
}: MediaViewProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={ref}
      aria-label={label}
      autoPlay
      playsInline
      muted={muted}
      className={cn('size-full object-cover', mirrored && '-scale-x-100', className)}
    />
  );
}
