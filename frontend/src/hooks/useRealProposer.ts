import { useQuery } from '@tanstack/react-query';
import { parseAbiItem } from 'viem';
import { getPublicClient, getContractAddress } from '../lib/contracts';

const VERSION_PROPOSED_EVENT = parseAbiItem(
  'event VersionProposed(uint256 indexed proposalId, uint256 indexed docId, address indexed proposer, uint256 parentVersionId, bytes32 contentHash, uint256 stakeAmount)'
);

export function useRealProposer(proposalId: number | undefined) {
  return useQuery({
    queryKey: ['realProposer', proposalId],
    queryFn: async () => {
      const pc = getPublicClient();
      const registryAddr = getContractAddress('PolkaInkRegistry') as `0x${string}`;
      const currentBlock = await pc.getBlockNumber();
      const fromBlock = currentBlock > 500_000n ? currentBlock - 500_000n : 0n;

      try {
        const logs = await pc.getLogs({
          address: registryAddr,
          event: VERSION_PROPOSED_EVENT,
          args: { proposalId: BigInt(proposalId!) },
          fromBlock,
          toBlock: 'latest',
        });
        if (logs.length > 0) {
          return {
            proposer: logs[0].args.proposer as string,
            txHash: logs[0].transactionHash,
          };
        }
      } catch {
        const allLogs = await pc.getLogs({
          address: registryAddr,
          event: VERSION_PROPOSED_EVENT,
          fromBlock,
          toBlock: 'latest',
        });
        const match = allLogs.find((l) => l.args.proposalId === BigInt(proposalId!));
        if (match) {
          return {
            proposer: match.args.proposer as string,
            txHash: match.transactionHash,
          };
        }
      }

      const govAddr = getContractAddress('GovernanceCore') as `0x${string}`;
      const govLogs = await pc.getLogs({
        address: govAddr,
        event: parseAbiItem(
          'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint8 proposalType, uint256 indexed docId, uint256 stakeAmount, uint256 startTime, uint256 endTime)'
        ),
        fromBlock,
        toBlock: 'latest',
      });
      const govMatch = govLogs.find((l) => l.args.proposalId === BigInt(proposalId!));
      if (govMatch) {
        const tx = await pc.getTransaction({ hash: govMatch.transactionHash });
        return { proposer: tx.from, txHash: govMatch.transactionHash };
      }

      return null;
    },
    enabled: proposalId !== undefined,
    staleTime: Infinity,
  });
}

export function useDocCreationTx(docId: number | undefined) {
  return useQuery({
    queryKey: ['docCreationTx', docId],
    queryFn: async () => {
      const pc = getPublicClient();
      const registryAddr = getContractAddress('PolkaInkRegistry') as `0x${string}`;
      const currentBlock = await pc.getBlockNumber();
      const fromBlock = currentBlock > 500_000n ? currentBlock - 500_000n : 0n;

      try {
        const logs = await pc.getLogs({
          address: registryAddr,
          event: parseAbiItem(
            'event DocumentCreated(uint256 indexed docId, address indexed author, string title, string[] tags, uint256 timestamp)'
          ),
          args: { docId: BigInt(docId!) },
          fromBlock,
          toBlock: 'latest',
        });
        if (logs.length > 0) return logs[0].transactionHash;
      } catch {
        const allLogs = await pc.getLogs({
          address: registryAddr,
          event: parseAbiItem(
            'event DocumentCreated(uint256 indexed docId, address indexed author, string title, string[] tags, uint256 timestamp)'
          ),
          fromBlock,
          toBlock: 'latest',
        });
        const match = allLogs.find((l) => l.args.docId === BigInt(docId!));
        if (match) return match.transactionHash;
      }
      return null;
    },
    enabled: docId !== undefined,
    staleTime: Infinity,
  });
}
