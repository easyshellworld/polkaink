export const formatEther = (value: bigint) => (Number(value) / 1e18).toString();
export const parseEther = (value: string) => BigInt(Math.floor(Number(value) * 1e18));
export const keccak256 = () => '0x' + '0'.repeat(64);
export const toHex = (data: Uint8Array) => '0x' + Buffer.from(data).toString('hex');
export const toBytes = (hex: string) => Buffer.from(hex.slice(2), 'hex');
export const decodeEventLog = () => ({});
export const decodeFunctionData = () => ({});
export const createPublicClient = () => ({
  readContract: jest.fn(),
  getBalance: jest.fn(),
  waitForTransactionReceipt: jest.fn(),
  getLogs: jest.fn(),
  getTransaction: jest.fn(),
});
export const createWalletClient = () => ({
  writeContract: jest.fn(),
  account: { address: '0x0000000000000000000000000000000000000000' },
});
export const http = () => ({});
export const custom = () => ({});
export const defineChain = (c: unknown) => c;
export const getContract = () => ({});
