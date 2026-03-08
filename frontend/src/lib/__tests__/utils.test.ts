import { shortenAddress, formatDate, timeRemaining } from '../utils';

describe('shortenAddress', () => {
  it('shortens a full Ethereum address', () => {
    const addr = '0x70c2aDa29240E6dA4cc978E10f8AFB9082Cc95B9';
    expect(shortenAddress(addr)).toBe('0x70c2...95B9');
  });

  it('handles short strings gracefully', () => {
    expect(shortenAddress('0x1234')).toBe('0x1234...1234');
  });
});

describe('formatDate', () => {
  it('formats a unix timestamp to readable date', () => {
    const ts = BigInt(1709164800);
    const result = formatDate(ts);
    expect(result).toMatch(/2024/);
  });

  it('accepts number timestamps', () => {
    const result = formatDate(1709164800);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});

describe('timeRemaining', () => {
  it('returns "Ended" for past timestamps', () => {
    const past = BigInt(Math.floor(Date.now() / 1000) - 3600);
    expect(timeRemaining(past)).toBe('Ended');
  });

  it('returns days and hours for future timestamps', () => {
    const future = BigInt(Math.floor(Date.now() / 1000) + 86400 * 3 + 7200);
    const result = timeRemaining(future);
    expect(result).toMatch(/3d 2h remaining/);
  });

  it('returns hours and minutes for less than 1 day', () => {
    const future = BigInt(Math.floor(Date.now() / 1000) + 7200 + 300);
    const result = timeRemaining(future);
    expect(result).toMatch(/2h 5m remaining/);
  });
});
