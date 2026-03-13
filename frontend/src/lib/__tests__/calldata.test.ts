jest.mock('viem', () => ({
  keccak256: (_data: string) => '0x' + 'a'.repeat(64),
  toHex: (_data: Uint8Array) => '0x' + Buffer.from(_data).toString('hex'),
}));

import { encodeMarkdown, decodeMarkdown, formatBytes } from '../calldata';

describe('encodeMarkdown', () => {
  it('encodes markdown string to bytes with hash', () => {
    const md = '# Hello World\n\nThis is a test document.';
    const result = encodeMarkdown(md);

    expect(ArrayBuffer.isView(result.contentBytes)).toBe(true);
    expect(result.contentHash).toMatch(/^0x/);
    expect(result.contentLength).toBe(new TextEncoder().encode(md).length);
  });

  it('handles empty strings', () => {
    const result = encodeMarkdown('');
    expect(result.contentLength).toBe(0);
    expect(result.contentBytes.length).toBe(0);
  });

  it('handles unicode content', () => {
    const md = '# 波卡历史\n\n这是一个中文文档。';
    const result = encodeMarkdown(md);
    expect(result.contentLength).toBeGreaterThan(0);
  });
});

describe('decodeMarkdown', () => {
  it('decodes Uint8Array back to string', () => {
    const original = '# Test Document\n\nContent here.';
    const bytes = new TextEncoder().encode(original);
    expect(decodeMarkdown(bytes)).toBe(original);
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576 * 2)).toBe('2.0 MB');
  });
});
