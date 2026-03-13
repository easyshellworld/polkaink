import i18n from './i18n';

export function shortenAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function formatDate(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString(i18n.language || 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeRemaining(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(endTime) - now;
  if (diff <= 0) return i18n.t('common.ended', 'Ended');
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return i18n.t('common.time_dh', { days, hours, defaultValue: '{{days}}d {{hours}}h' });
  const mins = Math.floor((diff % 3600) / 60);
  return i18n.t('common.time_hm', { hours, mins, defaultValue: '{{hours}}h {{mins}}m' });
}

export function getProposalSummary(description: string): string {
  if (!description) return '';

  try {
    const parsed = JSON.parse(description) as { summary?: string };
    if (typeof parsed.summary === 'string') return parsed.summary.trim();
  } catch {
    // noop
  }

  if (/^0x[0-9a-fA-F]{32,}$/.test(description)) {
    return '';
  }

  return description;
}
