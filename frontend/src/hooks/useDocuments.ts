import { useQuery } from '@tanstack/react-query';
import { getReadContract } from '../lib/contracts';

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
      const contract = getReadContract();
      const [docs, total] = await contract.listDocuments(page * perPage, perPage);
      return {
        documents: docs as DocumentData[],
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
      const contract = getReadContract();
      const doc = await contract.getDocument(id);
      return doc as DocumentData;
    },
    enabled: id !== undefined,
    staleTime: 30_000,
  });
}
