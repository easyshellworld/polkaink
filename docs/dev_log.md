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
## 20260301 18:24(ET)
* Multi-contract deployed to PAS: Registry, VersionStore, GovernanceCore, ArchiveCouncil, Timelock, NFTReward, Treasury, ProxyAdmin
* Frontend updated with new ABIs and API signatures
* Unified deploy script: scripts/deploy/deploy_all.ts
* UI & i18n improvements (en/zh-CN/kr), README updated
* Favicon redesigned → polkaink.svg
* CTA wording refined: "New Document" / "新建文档" / "새 문서"
* Add scripts for E2E Contract Test
## 20260301 18:38(ET)
* Security check
## 20260302
* 建议修订备忘录
  * 目前整个前端系统治理系统模块全部缺失，需要完善整个治理提案修订模块，审核，投票，伦理守卫等模块
  * 建议文档提案首页显示，按照时间修改倒序显示
  * 建议将前端整个`ethers`包替换为`viem`包，修改全部函数
  * 建议将i18n（国际化）改成联合国官方六大语言，`{"languages":{"en":"English","zh":"中文","fr":"Français","ru":"Русский","es":"Español","ar":"العربية"}}`
  * 建议在`/frontend`文件夹中，增加前端部署的`dockerfile`文件
  * 建议在`frontend`在前端增加`jest`利用模拟数据进行单元测试
* 完成`netlify`初步部署
* 修订简易`readme`
* 增加`LICENSE`文件
## 20260303 11:40(ET)
* fixed multiple bugs mentioned in RFC_doc.md
## 20260303 15:38(ET)
* polished ui
## 20260303 18:15(ET)
* trying to make slogan 信达雅