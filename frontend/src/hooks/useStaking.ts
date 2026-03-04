import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseEther } from 'viem';
import { readContract, writeContract, waitForTx, TX_GAS } from '../lib/contracts';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';

const STAKE_AMOUNT = parseEther('88');

export function useStakeInfo(address: string | null) {
  return useQuery({
    queryKey: ['stakeInfo', address],
    queryFn: async () => {
      if (!address) return null;
      const info = await readContract('StakingManager', 'getStake', [address as `0x${string}`]);
      return info as {
        amount: bigint;
        lockStart: bigint;
        lockEnd: bigint;
        lockMonths: number;
        active: boolean;
        memberNFTId: bigint;
      };
    },
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useIsMember(address: string | null) {
  return useQuery({
    queryKey: ['isMember', address],
    queryFn: async () => {
      if (!address) return false;
      return await readContract('StakingManager', 'isActiveMember', [address as `0x${string}`]) as boolean;
    },
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useTotalMembers() {
  return useQuery({
    queryKey: ['totalMembers'],
    queryFn: async () => {
      return Number(await readContract('StakingManager', 'totalActiveMembers') as bigint);
    },
    staleTime: 60_000,
  });
}

export function useStake() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const stake = useCallback(async (lockMonths: number) => {
    if (!walletClient) return;
    setSubmitting(true);
    const nid = `stake-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: 'Staking 88 DOT...' });
      const hash = await writeContract(walletClient, 'StakingManager', 'stake', [lockMonths], {
        value: STAKE_AMOUNT, gas: TX_GAS,
      });
      updateNotification(nid, { message: 'Waiting for confirmation...' });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: 'Staked successfully!' });
      queryClient.invalidateQueries({ queryKey: ['stakeInfo'] });
      queryClient.invalidateQueries({ queryKey: ['isMember'] });
      queryClient.invalidateQueries({ queryKey: ['totalMembers'] });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Stake failed: ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }, [walletClient, queryClient, addNotification, updateNotification]);

  return { submitting, stake };
}

export function useUnstake() {
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const queryClient = useQueryClient();
  const { addNotification, updateNotification } = useNotificationStore();

  const unstake = useCallback(async () => {
    if (!walletClient) return;
    setSubmitting(true);
    const nid = `unstake-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: 'Unstaking...' });
      const hash = await writeContract(walletClient, 'StakingManager', 'unstake', [], { gas: TX_GAS });
      updateNotification(nid, { message: 'Waiting for confirmation...' });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: 'Unstaked successfully!' });
      queryClient.invalidateQueries({ queryKey: ['stakeInfo'] });
      queryClient.invalidateQueries({ queryKey: ['isMember'] });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Unstake failed: ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }, [walletClient, queryClient, addNotification, updateNotification]);

  const earlyUnstake = useCallback(async () => {
    if (!walletClient) return;
    setSubmitting(true);
    const nid = `early-unstake-${Date.now()}`;
    try {
      addNotification({ id: nid, type: 'pending', message: 'Early unstaking (10% penalty)...' });
      const hash = await writeContract(walletClient, 'StakingManager', 'earlyUnstake', [], { gas: TX_GAS });
      updateNotification(nid, { message: 'Waiting for confirmation...' });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: 'Early unstake complete! 10% penalty applied.' });
      queryClient.invalidateQueries({ queryKey: ['stakeInfo'] });
      queryClient.invalidateQueries({ queryKey: ['isMember'] });
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Early unstake failed: ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }, [walletClient, queryClient, addNotification, updateNotification]);

  return { submitting, unstake, earlyUnstake };
}
