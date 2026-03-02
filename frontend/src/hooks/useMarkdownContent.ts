import { useQuery } from '@tanstack/react-query';
import { decodeFunctionData, parseAbiItem } from 'viem';
import { getPublicClient, getContractAddress, getAbi } from '../lib/contracts';

const VERSION_PROPOSED_EVENT = parseAbiItem(
  'event VersionProposed(uint256 indexed proposalId, uint256 indexed docId, address indexed proposer, uint256 parentVersionId, bytes32 contentHash, uint256 stakeAmount)'
);

export function useMarkdownContent(docId: number | undefined) {
  return useQuery({
    queryKey: ['markdownContent', docId],
    queryFn: async () => {
      if (!docId) return null;

      const pc = getPublicClient();
      const registryAddr = getContractAddress('PolkaInkRegistry') as `0x${string}`;
      const abi = getAbi('PolkaInkRegistry');
      const latestBlock = await pc.getBlockNumber();
      const fromBlock = latestBlock > 100_000n ? latestBlock - 100_000n : 0n;

      let logs;
      try {
        logs = await pc.getLogs({
          address: registryAddr,
          event: VERSION_PROPOSED_EVENT,
          args: { docId: BigInt(docId) },
          fromBlock,
          toBlock: 'latest',
        });
      } catch {
        logs = await pc.getLogs({
          address: registryAddr,
          event: VERSION_PROPOSED_EVENT,
          fromBlock,
          toBlock: 'latest',
        });
        logs = logs.filter((l) => l.args.docId === BigInt(docId));
      }

      if (logs.length === 0) return null;

      const latestLog = logs[logs.length - 1];
      const tx = await pc.getTransaction({ hash: latestLog.transactionHash });
      if (!tx) return null;

      const decoded = decodeFunctionData({ abi, data: tx.input });
      if (decoded.functionName !== 'proposeVersion') return null;

      const mdHex = (decoded.args as unknown[])[3] as `0x${string}`;
      const hex = mdHex.slice(2);
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return new TextDecoder().decode(bytes);
    },
    enabled: docId !== undefined && docId > 0,
    staleTime: 5 * 60_000,
  });
}
