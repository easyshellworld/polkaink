import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export interface DocumentData {
  id: bigint;
  title: string;
  author: string;
  currentVersionId: bigint;
  createdAt: bigint;
  updatedAt: bigint;
  status: number;
  tags: string[];
}

export function useDocuments(page: number, perPage = 10) {
  return useQuery({
    queryKey: ['documents', page, perPage],
    queryFn: async () => {
      const result = await readContract('PolkaInkRegistry', 'listDocuments', [
        BigInt(page * perPage),
        BigInt(perPage),
      ]);
      const [docs, total] = result as [DocumentData[], bigint];
      const sorted = [...docs].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
      return {
        documents: sorted,
        total: Number(total),
      };
    },
    staleTime: 30_000,
  });
}

export function useDocument(id: number | undefined) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const doc = await readContract('PolkaInkRegistry', 'getDocument', [BigInt(id!)]);
      return doc as DocumentData;
    },
    enabled: id !== undefined,
    staleTime: 30_000,
  });
}
