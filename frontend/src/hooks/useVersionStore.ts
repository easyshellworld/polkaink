import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export interface VersionData {
  id: bigint;
  versionId: bigint;
  docId: bigint;
  parentVersionId: bigint;
  author: string;
  proposalId: bigint;
  contentHash: string;
  blockNumber: bigint;
  txBlock: bigint;
  txIndex: bigint;
  timestamp: bigint;
  contentLength: number;
}

export function useVersion(versionId: number | undefined) {
  return useQuery({
    queryKey: ['version', versionId],
    queryFn: async () => {
      const raw = await readContract('VersionStore', 'getVersion', [BigInt(versionId!)]) as Omit<VersionData, 'id' | 'blockNumber' | 'contentLength'>;
      return {
        ...raw,
        id: raw.versionId,
        blockNumber: raw.txBlock,
        contentLength: 0,
      } as VersionData;
    },
    enabled: versionId !== undefined,
    staleTime: 60_000,
  });
}

export function useVersionHistory(docId: number | undefined) {
  return useQuery({
    queryKey: ['versionHistory', docId],
    queryFn: async () => {
      const h = await readContract('VersionStore', 'getVersionsByDoc', [BigInt(docId!)]);
      return h as bigint[];
    },
    enabled: docId !== undefined,
    staleTime: 60_000,
  });
}
