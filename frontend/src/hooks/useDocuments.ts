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
      
      const docsWithVersions = await Promise.all(
        docsRaw.map(async (doc) => {
          let updatedAt = doc.createdAt;
          
          if (doc.currentVersionId > 0n) {
            try {
              const version = await readContract('VersionStore', 'getVersion', [doc.currentVersionId]) as {
                versionId: bigint;
                docId: bigint;
                parentVersionId: bigint;
                author: string;
                proposalId: bigint;
                contentHash: string;
                txBlock: bigint;
                txIndex: bigint;
                timestamp: bigint;
              };
              updatedAt = version.timestamp;
            } catch (error) {
              console.error(`Failed to fetch version ${doc.currentVersionId}:`, error);
            }
          }
          
          return {
            id: doc.docId,
            docId: doc.docId,
            title: doc.title,
            tags: doc.tags,
            author: doc.author,
            createdAt: doc.createdAt,
            updatedAt,
            status: doc.status,
            isSeed: doc.isSeed,
            currentVersionId: doc.currentVersionId,
            latestProposalId: doc.latestProposalId,
          };
        })
      );
      
      const sorted = [...docsWithVersions].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
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
      
      let updatedAt = raw.createdAt;
      if (raw.currentVersionId > 0n) {
        try {
          const version = await readContract('VersionStore', 'getVersion', [raw.currentVersionId]) as {
            versionId: bigint;
            docId: bigint;
            parentVersionId: bigint;
            author: string;
            proposalId: bigint;
            contentHash: string;
            txBlock: bigint;
            txIndex: bigint;
            timestamp: bigint;
          };
          updatedAt = version.timestamp;
        } catch (error) {
          console.error(`Failed to fetch version ${raw.currentVersionId}:`, error);
        }
      }
      
      return {
        id: raw.docId,
        docId: raw.docId,
        title: raw.title,
        tags: raw.tags,
        author: raw.author,
        createdAt: raw.createdAt,
        updatedAt,
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
