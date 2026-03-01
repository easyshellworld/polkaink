## 20260225
* 完成项目`github`搭建
* 完成开发设计书初稿
* 定义dev分支
## 20260225 15:26(ET)
* updated dev_doc.md
## 20260225 17:39(ET)
* Contract: `contracts/PolkaInk.sol` (registry + versioning + governance), 15/15 tests pass
* Deployed to PAS (Chain ID 420420417): [`0x401e00E5b9bAFc674EE804BaBfC18D6eeEE8e49E`](https://polkadot.testnet.routescan.io/address/0x401e00E5b9bAFc674EE804BaBfC18D6eeEE8e49E)
* Frontend: `frontend/` — React + Vite + Tailwind + ethers.js, 7 pages, MetaMask integration
* E2E verified — 2 docs created on-chain via frontend
## 20260225 19:58(ET)
* Unit tests expanded: 15 → 112 (comprehensive coverage)
## 20260225 20:10(ET)
* First version readme (all ai generated)
## 20260225 21:02(ET)
* Add github ci
## 20260226
* 完善部分文档，继续执行路线图，计划调整目录结构。
* 填充合约架构
## 20260226 13:41(ET)
* Frontend refactor
## 20260226 14:30(ET)
* Frontend fully aligned with dev_doc §10.3 (all pages/components/hooks/lib/styles)
* 64 contract tests, tsc + vite build + eslint clean
## 20260226 15:22(ET)
* Multi-contract deployed to PAS: Registry, VersionStore, GovernanceCore, ArchiveCouncil, Timelock, NFTReward, Treasury, ProxyAdmin
* Frontend updated: multi-contract ABIs + new API signatures
* Added `GovernanceCore.setRegistry()` for circular deploy dependency
* Unified deploy script: `scripts/deploy/deploy_all.ts`
## 20260226 22:30(ET)
* UI polish: compact stats bar, nav active states, animations, emoji cleanup, donate/footer links
* Markdown preview on document pages (calldata decoding)
* Agent Skill button in header + `skills/polkaink_agent_skill.md`
* i18n refined (en/zh-CN/kr), readme updated
## 20260226 23:00(ET)
* Favicon redesigned (gradient quill + chain motif SVG) -> polkaink.svg
* CTA wording refined: "New Document" / "新建文档" / "새 문서"
* README trilingual (en/zh-CN/kr)