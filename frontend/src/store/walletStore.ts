import { create } from 'zustand';
import { ethers } from 'ethers';

interface WalletState {
  address: string | null;
  signer: ethers.Signer | null;
  balance: string;
  chainId: number | null;
  isConnecting: boolean;
  setWallet: (address: string, signer: ethers.Signer, balance: string, chainId: number) => void;
  clearWallet: () => void;
  setConnecting: (v: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  signer: null,
  balance: '0',
  chainId: null,
  isConnecting: false,
  setWallet: (address, signer, balance, chainId) =>
    set({ address, signer, balance, chainId, isConnecting: false }),
  clearWallet: () =>
    set({ address: null, signer: null, balance: '0', chainId: null }),
  setConnecting: (v) => set({ isConnecting: v }),
}));
