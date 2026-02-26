import { useMemo } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '../store/walletStore';
import { getReadContract, getWriteContract, TX_OVERRIDES } from '../lib/contracts';

export function useReadContract() {
  return useMemo(() => getReadContract(), []);
}

export function useWriteContract() {
  const signer = useWalletStore((s) => s.signer);
  return useMemo(() => (signer ? getWriteContract(signer) : null), [signer]);
}

export { TX_OVERRIDES };
export type { ethers };
