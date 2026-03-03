## 20260303
* contracts
    * 首先检查`Contracts — test on Polkadot node`为什么合约测试失败。查明相关具体原因。
    * 需要输出一份现有的`contracts`流程图。
* frontend
    * `Governance`中核实投票失败问题，需要与合约abi再次进行核对，以合约逻辑为主（不可修订合约与abi），显示错误如下：
      ```
      Vote failed: Could not find an Account to execute with this Action. Please provide an Account with the `account` argument on the Action, or by supplying an `account` to the Client. Docs: https://viem.sh/docs/contract/writeContract#account Version: viem@2.46.3
      ```
    * `Governance`中提案名称`Version Update Proposal`改成所创建的文档的标题名称。
    * `Governance`中的`Proposer`显示地址并非真实的提案人，显示的是合约地址，改成需要查询修订为提案人账户地址
   
    * `Library`中没有实现倒序排列文档
    * `Library`中文档访问`View on Explorer`应该改直接访问具体交易hash(类似如此格式：`https://polkadot.testnet.routescan.io/tx/0xa06db9ad4bfcbea60fec36f8b7a89586972a5190aabd1a126e21c1445fdb9073`,其实hash为动态hash),而不是使用查看`https://polkadot.testnet.routescan.io/address/0x959b25F190189e588DaC814a95fe13a97d5198A1`

    * `header`与`ConnectButton`组件中，如何修改链接钱包完成后，改变状态为下拉菜单，增加`profile`与`logiout`按钮，`porfile`按钮可跳转`profile`信息。

    * `home`或`header`中，如何结合`Treasury.json`ABI，以及现有的`Treasury`页面及组件，形成入口,并显示相关信息
    * `home`或`header`中，利用`ArchiveCouncil.json`的ABI，构建相关页面，并形成入口。
    
    
