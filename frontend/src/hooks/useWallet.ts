import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatEther } from 'viem';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { PAS_NETWORK } from '../lib/contracts/addresses';
import { switchToPAS, getPublicClient, createBrowserWalletClient } from '../lib/contracts';

export function useWallet() {
  const { t } = useTranslation();
  const { address, walletClient, balance, isConnecting, setWallet, clearWallet, setConnecting } =
    useWalletStore();
  const { addNotification } = useNotificationStore();

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      addNotification({ id: 'wallet', type: 'error', message: t('wallet.install_metamask') });
      return;
    }
    setConnecting(true);
    try {
      await switchToPAS();
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];
      const addr = accounts[0];
      const wc = createBrowserWalletClient(addr as `0x${string}`);
      const pc = getPublicClient();
      const bal = await pc.getBalance({ address: addr as `0x${string}` });
      setWallet(addr, wc, formatEther(bal), PAS_NETWORK.chainId);
      addNotification({ id: 'wallet', type: 'success', message: t('wallet.connected') });
    } catch (err) {
      addNotification({ id: 'wallet', type: 'error', message: t('wallet.connection_failed', { error: (err as Error).message }) });
      setConnecting(false);
    }
  }, [t, setWallet, setConnecting, addNotification]);

  const disconnect = useCallback(() => {
    clearWallet();
  }, [clearWallet]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleChange = () => clearWallet();
    window.ethereum.on('accountsChanged', handleChange);
    window.ethereum.on('chainChanged', handleChange);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleChange);
      window.ethereum?.removeListener('chainChanged', handleChange);
    };
  }, [clearWallet]);

  return { address, walletClient, balance, isConnecting, connect, disconnect };
}
