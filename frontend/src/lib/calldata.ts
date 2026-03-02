import { keccak256, toHex } from 'viem';

export function encodeMarkdown(markdown: string): {
  contentBytes: Uint8Array;
  contentHash: `0x${string}`;
  contentLength: number;
} {
  const contentBytes = new TextEncoder().encode(markdown);
  const contentHash = keccak256(toHex(contentBytes));
  return { contentBytes, contentHash, contentLength: contentBytes.length };
}

export function decodeMarkdown(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
