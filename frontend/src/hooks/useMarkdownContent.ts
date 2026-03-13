import { useQuery } from '@tanstack/react-query';
import { decodeFunctionData, parseAbiItem } from 'viem';
import { getPublicClient, getAbi, getContractAddress } from '../lib/contracts';
import { readContract } from '../lib/contracts';
import type { VersionData } from './useVersionStore';

function isHexString(value: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(value) && value.length % 2 === 0;
}

function decodeHexToUtf8(hex: string): string {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(raw.length / 2);
  for (let i = 0; i < raw.length; i += 2) {
    bytes[i / 2] = parseInt(raw.slice(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

function parseMarkdownPayload(input: string): string {
  if (!input) return '';

  if (isHexString(input)) {
    return decodeHexToUtf8(input);
  }

  try {
    const parsed = JSON.parse(input) as { markdown?: string };
    if (typeof parsed.markdown === 'string') return parsed.markdown;
  } catch {
    // noop
  }

  return input;
}

export async function fetchMarkdownByVersion(versionId: bigint): Promise<string | null> {
  const version = await readContract('VersionStore', 'getVersion', [versionId]) as VersionData;
  if (!version || version.contentHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return null;
  }

  const pc = getPublicClient();
  const registryAbi = getAbi('PolkaInkRegistry');
  const registryAddr = getContractAddress('PolkaInkRegistry') as `0x${string}`;
  const logs = await pc.getLogs({
    address: registryAddr,
    event: parseAbiItem(
      'event VersionProposed(uint256 indexed docId, uint256 indexed proposalId, address indexed proposer, uint256 parentVersionId, uint256 targetVersionId)'
    ),
    fromBlock: version.txBlock,
    toBlock: version.txBlock,
  });
  const matched = logs.find((l) => l.args.targetVersionId === versionId);
  if (!matched) return null;

  const tx = await pc.getTransaction({ hash: matched.transactionHash });
  if (!tx.input) return null;

  const decoded = decodeFunctionData({ abi: registryAbi, data: tx.input as `0x${string}` });
  if (decoded.functionName !== 'proposeVersion') return null;

  const description = (decoded.args as unknown[])[3] as string;
  return parseMarkdownPayload(description);
}

export function useMarkdownContent(docId: number | undefined) {
  return useQuery({
    queryKey: ['markdownContent', docId],
    queryFn: async () => {
      if (!docId) return null;
      const doc = await readContract('PolkaInkRegistry', 'getDocument', [BigInt(docId)]) as { currentVersionId: bigint };
      if (!doc.currentVersionId || doc.currentVersionId <= 0n) return null;
      return fetchMarkdownByVersion(doc.currentVersionId);
    },
    enabled: docId !== undefined && docId > 0,
    staleTime: 5 * 60_000,
  });
}

export function useProposalMarkdown(targetVersionId: bigint | undefined) {
  return useQuery({
    queryKey: ['proposalMarkdown', targetVersionId?.toString()],
    queryFn: async () => {
      if (!targetVersionId || targetVersionId <= 0n) return null;
      return fetchMarkdownByVersion(targetVersionId);
    },
    enabled: !!targetVersionId && targetVersionId > 0n,
    staleTime: 5 * 60_000,
  });
}

export function useVersionMarkdown(versionId: bigint | undefined) {
  return useQuery({
    queryKey: ['versionMarkdown', versionId?.toString()],
    queryFn: async () => {
      if (!versionId || versionId <= 0n) return null;
      return fetchMarkdownByVersion(versionId);
    },
    enabled: !!versionId && versionId > 0n,
    staleTime: 5 * 60_000,
  });
}
