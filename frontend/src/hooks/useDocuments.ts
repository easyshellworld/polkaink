import { useQuery } from '@tanstack/react-query';
import { readContract } from '../lib/contracts';

export interface DocumentData {
  id: bigint;
  docId: bigint;
  title: string;
  author: string;
  currentVersionId: bigint;
  createdAt: bigint;
  updatedAt: bigint;
  status: number;
  isSeed: boolean;
  latestProposalId: bigint;
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
      const [docsRaw, total] = result as [Array<{
        docId: bigint;
        title: string;
        tags: string[];
        author: string;
        createdAt: bigint;
        status: number;
        isSeed: boolean;
        currentVersionId: bigint;
        latestProposalId: bigint;
      }>, bigint];
      const docs = docsRaw.map((doc) => ({
        id: doc.docId,
        docId: doc.docId,
        title: doc.title,
        tags: doc.tags,
        author: doc.author,
        createdAt: doc.createdAt,
        updatedAt: doc.createdAt,
        status: doc.status,
        isSeed: doc.isSeed,
        currentVersionId: doc.currentVersionId,
        latestProposalId: doc.latestProposalId,
      }));
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
      const raw = await readContract('PolkaInkRegistry', 'getDocument', [BigInt(id!)]) as {
        docId: bigint;
        title: string;
        tags: string[];
        author: string;
        createdAt: bigint;
        status: number;
        isSeed: boolean;
        currentVersionId: bigint;
        latestProposalId: bigint;
      };
      return {
        id: raw.docId,
        docId: raw.docId,
        title: raw.title,
        tags: raw.tags,
        author: raw.author,
        createdAt: raw.createdAt,
        updatedAt: raw.createdAt,
        status: raw.status,
        isSeed: raw.isSeed,
        currentVersionId: raw.currentVersionId,
        latestProposalId: raw.latestProposalId,
      } as DocumentData;
    },
    enabled: id !== undefined,
    staleTime: 30_000,
  });
}
