import { useQuery } from '@tanstack/react-query';
import { decodeFunctionData } from 'viem';
import { getPublicClient, getContractAddress, getAbi } from '../lib/contracts';

export function useMarkdownContent(docId: number | undefined) {
  return useQuery({
    queryKey: ['markdownContent', docId],
    queryFn: async () => {
      if (!docId) return null;

      const pc = getPublicClient();
      const registryAddr = getContractAddress('PolkaInkRegistry') as `0x${string}`;
      const abi = getAbi('PolkaInkRegistry');

      const logs = await pc.getLogs({
        address: registryAddr,
        event: {
          type: 'event',
          name: 'VersionProposed',
          inputs: [
            { type: 'uint256', name: 'proposalId', indexed: true },
            { type: 'uint256', name: 'docId', indexed: true },
            { type: 'address', name: 'proposer', indexed: true },
            { type: 'uint256', name: 'parentVersionId' },
            { type: 'bytes32', name: 'contentHash' },
            { type: 'uint256', name: 'stakeAmount' },
          ],
        },
        args: { docId: BigInt(docId) },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      if (logs.length === 0) return null;

      const latestLog = logs[logs.length - 1];
      const tx = await pc.getTransaction({ hash: latestLog.transactionHash });
      if (!tx || tx.to?.toLowerCase() !== registryAddr.toLowerCase()) return null;

      const decoded = decodeFunctionData({ abi, data: tx.input });
      if (decoded.functionName !== 'proposeVersion') return null;

      const mdBytes = (decoded.args as unknown[])[3] as `0x${string}`;
      const hex = mdBytes.slice(2);
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
