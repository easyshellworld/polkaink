import { useMemo, useState } from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  text: string;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function ShareButton({ url, title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const links = useMemo(() => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const encodedTitle = encodeURIComponent(title);
    return {
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}%20-%20${encodedText}&url=${encodedUrl}`,
      tg: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}%20-%20${encodedText}`,
    };
  }, [url, title, text]);

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      }
    } catch {
      // ignore cancelled share
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore copy failure
    }
  };

  const showNativeShare = typeof navigator !== 'undefined' && !!navigator.share && isMobileDevice();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showNativeShare && (
        <button
          onClick={handleNativeShare}
          className="inline-flex items-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          Share
        </button>
      )}
      <a
        href={links.x}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        X
      </a>
      <a
        href={links.tg}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        TG
      </a>
      <button
        onClick={handleCopy}
        className="inline-flex items-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
