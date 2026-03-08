# PolkaInk 测试网部署报告

## 1. 部署信息
- 部署时间（UTC）：2026-03-08
- 网络：Polkadot Hub Testnet (PAS)
- RPC：`https://services.polkadothub-rpc.com/testnet`
- Chain ID：`420420417`
- 部署脚本：`contracts/scripts/deploy/deploy_all.ts`
- 执行命令：

```bash
cd contracts
HOME=/tmp XDG_CONFIG_HOME=/tmp npx hardhat run scripts/deploy/deploy_all.ts --network pasTestnet
```

## 2. 部署账户
- Deployer：`0x70c2aDa29240E6dA4cc978E10f8AFB9082Cc95B9`
- 部署前余额：`9794.6214622115 PAS`

## 3. 合约地址
- ProxyAdmin: `0x38De01370A92cB59b7d7EA2455c97b60C2B33511`
- TimelockController: `0x427d81F07e61509276F6D1f0bcEb1E76804E5003`
- NFTReward: `0x77d1c237DECA47875F6f4ffd254Eb59Ae80a050E`
- Treasury: `0xcb9908A9Ea3b261F8f4DeB8f78A85b05109aE747`
- VersionStore: `0xe38C44d4a42B3735B8669a73832C29F86B7295D2`
- StakingManager: `0x8C3d35d1dDA19a232fE926DE5C3C68613E8DA43a`
- GovernanceCore: `0x37C7e24b4B287AAbD79b216D9AFC125Dc56Ae007`
- PolkaInkRegistry: `0x4Fc3c079736FfE94aef94ab6560578Aec850175b`
- ArchiveCouncil: `0x3e60dC2FBfE1EB3A8754CfD2A97C9fF9543F10a8`

以上地址已写入：`contracts/deployed-addresses.json`。

## 4. 部署动作结果
- 9 个核心合约全部部署成功。
- 完成跨合约引用设置（GovernanceCore、ArchiveCouncil）。
- 完成关键角色授权（WRITER/GOVERNANCE/COUNCIL/SPEND/UPGRADER/PROPOSER/CANCELLER 等）。
- ProxyAdmin ownership 已转移至 TimelockController。
- Treasury 已注资 reward pool：`5000 PAS`。
- 已创建 4 条 seed 文档。
- `SEED_CREATOR_ROLE` 已由部署账户放弃（renounce）。

## 5. 链上只读验收
执行了 RPC 只读校验（区块高度：`6140280`）：
- `PolkaInkRegistry.totalDocuments()` = `4`
- `Treasury.rewardPoolBalance()` = `5000.0 PAS`
- `Treasury.epochStartTime()` = `1772953512`（`2026-03-08 07:05:12 UTC`）

## 6. 浏览器链接（Routescan）
- ProxyAdmin: https://polkadot.testnet.routescan.io/address/0x38De01370A92cB59b7d7EA2455c97b60C2B33511
- TimelockController: https://polkadot.testnet.routescan.io/address/0x427d81F07e61509276F6D1f0bcEb1E76804E5003
- NFTReward: https://polkadot.testnet.routescan.io/address/0x77d1c237DECA47875F6f4ffd254Eb59Ae80a050E
- Treasury: https://polkadot.testnet.routescan.io/address/0xcb9908A9Ea3b261F8f4DeB8f78A85b05109aE747
- VersionStore: https://polkadot.testnet.routescan.io/address/0xe38C44d4a42B3735B8669a73832C29F86B7295D2
- StakingManager: https://polkadot.testnet.routescan.io/address/0x8C3d35d1dDA19a232fE926DE5C3C68613E8DA43a
- GovernanceCore: https://polkadot.testnet.routescan.io/address/0x37C7e24b4B287AAbD79b216D9AFC125Dc56Ae007
- PolkaInkRegistry: https://polkadot.testnet.routescan.io/address/0x4Fc3c079736FfE94aef94ab6560578Aec850175b
- ArchiveCouncil: https://polkadot.testnet.routescan.io/address/0x3e60dC2FBfE1EB3A8754CfD2A97C9fF9543F10a8

