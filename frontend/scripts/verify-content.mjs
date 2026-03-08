import { createPublicClient, http, defineChain, decodeFunctionData, parseAbiItem } from 'viem';
import { readFileSync } from 'fs';

const RPC = 'https://services.polkadothub-rpc.com/testnet';
const pasChain = defineChain({
  id: 420420417, name: 'PAS', nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});
const pc = createPublicClient({ chain: pasChain, transport: http(RPC) });
const registryAddr = '0x959b25F190189e588DaC814a95fe13a97d5198A1';
const abi = JSON.parse(readFileSync('./src/lib/contracts/abis/PolkaInkRegistry.json', 'utf-8'));

const event = parseAbiItem('event VersionProposed(uint256 indexed proposalId, uint256 indexed docId, address indexed proposer, uint256 parentVersionId, bytes32 contentHash, uint256 stakeAmount)');

const latestBlock = await pc.getBlockNumber();
const fromBlock = latestBlock - 100000n;

const logs = await pc.getLogs({ address: registryAddr, event, fromBlock, toBlock: 'latest' });
console.log(`Total VersionProposed logs: ${logs.length}`);

for (const log of logs) {
  console.log(`\n--- Doc #${log.args.docId}, Proposal #${log.args.proposalId} ---`);
  const tx = await pc.getTransaction({ hash: log.transactionHash });
  const decoded = decodeFunctionData({ abi, data: tx.input });
  if (decoded.functionName !== 'proposeVersion') { console.log('  Not proposeVersion'); continue; }
  const mdHex = decoded.args[3];
  const hex = mdHex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  const content = new TextDecoder().decode(bytes);
  console.log(`  Content (${content.length} chars): "${content.slice(0, 150)}..."`);
}
