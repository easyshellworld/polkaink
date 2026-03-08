import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture, stakeFor } from "../fixtures/deployFixture";

describe("VersionStore v3.3", () => {
  describe("storeVersion", () => {
    it("should revert for unauthorized callers", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await expect(
        contracts.versionStore.connect(actors.author1).storeVersion(
          1, 0, actors.author1.address, 0, ethers.ZeroHash, 1, 0
        )
      ).to.be.reverted;
    });

    it("should store version via Registry", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc");

      expect(await contracts.versionStore.totalVersions()).to.equal(1n);

      const v = await contracts.versionStore.getVersion(1);
      expect(v.docId).to.equal(1n);
      expect(v.contentHash).to.equal(ethers.ZeroHash);
    });
  });

  describe("getVersionsByDoc", () => {
    it("should return version ids for a document", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      await stakeFor(contracts.stakingManager, actors.author1);
      await contracts.registry.connect(actors.author1).createDocument("Doc", [], "desc");

      const versions = await contracts.versionStore.getVersionsByDoc(1);
      expect(versions.length).to.equal(1);
    });
  });
});
