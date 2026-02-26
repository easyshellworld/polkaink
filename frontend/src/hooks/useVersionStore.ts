import { useQuery } from '@tanstack/react-query';
import { getReadContract } from '../lib/contracts';

export interface VersionData {
  id: bigint;
  docId: bigint;
  parentVersionId: bigint;
  author: string;
  contentHash: string;
  blockNumber: bigint;
  timestamp: bigint;
  compression: number;
  contentLength: number;
}

export function useVersion(versionId: number | undefined) {
  return useQuery({
    queryKey: ['version', versionId],
    queryFn: async () => {
      const contract = getReadContract();
      return (await contract.getVersion(versionId)) as VersionData;
    },
    enabled: versionId !== undefined,
    staleTime: 60_000,
  });
}

export function useVersionHistory(docId: number | undefined) {
  return useQuery({
    queryKey: ['versionHistory', docId],
    queryFn: async () => {
      const contract = getReadContract();
      return (await contract.getVersionHistory(docId)) as bigint[];
    },
    enabled: docId !== undefined,
    staleTime: 60_000,
  });
}
