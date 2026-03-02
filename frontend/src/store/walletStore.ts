import { create } from 'zustand';
import type { WalletClient } from 'viem';

interface WalletState {
  address: string | null;
  walletClient: WalletClient | null;
  balance: string;
  chainId: number | null;
  isConnecting: boolean;
  setWallet: (address: string, walletClient: WalletClient, balance: string, chainId: number) => void;
  clearWallet: () => void;
  setConnecting: (v: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  walletClient: null,
  balance: '0',
  chainId: null,
  isConnecting: false,
  setWallet: (address, walletClient, balance, chainId) =>
    set({ address, walletClient, balance, chainId, isConnecting: false }),
  clearWallet: () =>
    set({ address: null, walletClient: null, balance: '0', chainId: null }),
  setConnecting: (v) => set({ isConnecting: v }),
}));
