import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { fetchAuthedBlobUrl } from '../../api/client';

interface AuthedImageProps {
  path: string; // e.g. "/photos/{id}/file"
  alt: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Evidence photos are served from an authenticated endpoint, never a public
 * URL (PRD Section 50). A plain <img src> can't carry an Authorization
 * header, so this fetches the bytes once and hands the browser a local
 * blob: URL instead.
 */
export const AuthedImage: React.FC<AuthedImageProps> = ({ path, alt, className, onClick }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSrc(null);

    fetchAuthedBlobUrl(path)
      .then(url => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrlRef.current = url;
        setSrc(url);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [path]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <ImageOff size={20} />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 animate-pulse ${className}`}>
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onClick={onClick} />;
};
