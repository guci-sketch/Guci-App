import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2, Trash2 } from 'lucide-react';
import { fetchAuthedBlobUrl } from '../../api/client';

interface AuthedImageProps {
  path: string; // e.g. "/photos/{id}/file"
  alt: string;
  className?: string;
  onClick?: () => void;
  /** Pass `photo.purgedAt` truthiness here — skips the doomed fetch entirely and shows a clear reason instead of a generic broken-image icon. */
  purged?: boolean;
}

/**
 * Evidence photos are served from an authenticated endpoint, never a public
 * URL (PRD Section 50). A plain <img src> can't carry an Authorization
 * header, so this fetches the bytes once and hands the browser a local
 * blob: URL instead.
 */
export const AuthedImage: React.FC<AuthedImageProps> = ({ path, alt, className, onClick, purged }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (purged) return; // don't bother fetching — the file is gone by design (retention), not an error
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
  }, [path, purged]);

  if (purged) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 text-center p-1 ${className}`} title="Foto sudah dihapus sesuai kebijakan retensi penyimpanan">
        <Trash2 size={16} />
        <span className="text-[9px] leading-tight px-1">Foto dihapus (retensi)</span>
      </div>
    );
  }

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
