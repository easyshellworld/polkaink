import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { getProvider, getReadContract } from '../lib/contracts';
import RegistryABI from '../lib/contracts/abis/PolkaInkRegistry.json';

/**
 * Fetches Markdown content stored as calldata in proposeVersion transactions.
 * Queries VersionProposed events for the given docId, then decodes the tx input.
 */
export function useMarkdownContent(docId: number | undefined) {
  return useQuery({
    queryKey: ['markdownContent', docId],
    queryFn: async () => {
      if (!docId) return null;

      const provider = getProvider();
      const registry = getReadContract('PolkaInkRegistry');
      const registryAddr = await registry.getAddress();

      const events = await registry.queryFilter('VersionProposed', 0);
      const docEvents = events.filter(
        (e) => Number((e as ethers.EventLog).args?.[1]) === docId
      );

      if (docEvents.length === 0) return null;

      const latestEvent = docEvents[docEvents.length - 1];
      const tx = await provider.getTransaction(latestEvent.transactionHash);
      if (!tx || tx.to?.toLowerCase() !== registryAddr.toLowerCase()) return null;

      const iface = new ethers.Interface(RegistryABI);
      const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
      if (!decoded || decoded.name !== 'proposeVersion') return null;

      const mdBytes = decoded.args[3];
      return new TextDecoder().decode(ethers.getBytes(mdBytes));
    },
    enabled: docId !== undefined && docId > 0,
    staleTime: 5 * 60_000,
  });
}
