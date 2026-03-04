import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "../fixtures/deployFixture";

describe("Upgrade Flow (v2)", () => {
  it("contracts should be upgradeable via UUPS", async () => {
    const { contracts, actors } = await loadFixture(deployFixture);
    const { registry } = contracts;

    const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
    await registry.connect(actors.admin).grantRole(UPGRADER_ROLE, actors.admin.address);

    const RegistryV2 = await ethers.getContractFactory("PolkaInkRegistry");
    const upgraded = await upgrades.upgradeProxy(await registry.getAddress(), RegistryV2, {
      kind: "uups",
    });

    const totalDocs = await upgraded.totalDocuments();
    expect(totalDocs).to.be.gte(0n);
  });
});
