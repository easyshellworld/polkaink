export function shortenAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function formatDate(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeRemaining(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(endTime) - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hours}h ${mins}m remaining`;
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
