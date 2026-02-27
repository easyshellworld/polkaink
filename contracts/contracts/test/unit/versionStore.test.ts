import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployFixture } from "../fixtures/deployFixture";

describe("VersionStore", () => {
  describe("storeVersion", () => {
    it("should store version and emit VersionStored", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { versionStore } = contracts;
      const { admin, author1 } = actors;

      // Grant WRITER_ROLE to admin for direct testing
      const WRITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
      await versionStore.connect(admin).grantRole(WRITER_ROLE, admin.address);

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("content"));
      await expect(
        versionStore.connect(admin).storeVersion(1, 0, author1.address, contentHash, 1, 100)
      )
        .to.emit(versionStore, "VersionStored")
        .withArgs(1, 1, 0, author1.address, contentHash, (v: bigint) => v > 0n);
    });

    it("should track parent-child relationships", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { versionStore } = contracts;
      const { admin, author1 } = actors;

      const WRITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
      await versionStore.connect(admin).grantRole(WRITER_ROLE, admin.address);

      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("v1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("v2"));

      await versionStore.connect(admin).storeVersion(1, 0, author1.address, hash1, 1, 100);
      await versionStore.connect(admin).storeVersion(1, 1, author1.address, hash2, 1, 200);

      const children = await versionStore.getChildren(1);
      expect(children).to.include(2n);

      const ancestors = await versionStore.getAncestors(2);
      expect(ancestors).to.include(1n);
    });

    it("should revert when called without WRITER_ROLE", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { versionStore, author1 } = { ...contracts, author1: actors.author1 };

      await expect(
        versionStore.connect(author1).storeVersion(1, 0, author1.address, ethers.ZeroHash, 0, 0)
      ).to.be.reverted;
    });
  });

  describe("appendShard", () => {
    it("should append shard and mark version as sharded", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { versionStore } = contracts;
      const { admin, author1 } = actors;

      const WRITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
      await versionStore.connect(admin).grantRole(WRITER_ROLE, admin.address);

      await versionStore.connect(admin).storeVersion(1, 0, author1.address, ethers.ZeroHash, 1, 500);
      const shardHash = ethers.keccak256(ethers.toUtf8Bytes("shard0"));
      await expect(
        versionStore.connect(admin).appendShard(1, 0, shardHash, 12345n)
      ).to.emit(versionStore, "ShardAppended").withArgs(1, 0, shardHash);

      const version = await versionStore.getVersion(1);
      expect(version.isSharded).to.be.true;
      expect(version.shardCount).to.equal(1);

      const shards = await versionStore.getShards(1);
      expect(shards.length).to.equal(1);
      expect(shards[0].shardHash).to.equal(shardHash);
    });
  });

  describe("getVersionDAG", () => {
    it("should return correct DAG for a document", async () => {
      const { contracts, actors } = await loadFixture(deployFixture);
      const { versionStore } = contracts;
      const { admin, author1 } = actors;

      const WRITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("WRITER_ROLE"));
      await versionStore.connect(admin).grantRole(WRITER_ROLE, admin.address);

      await versionStore.connect(admin).storeVersion(1, 0, author1.address, ethers.ZeroHash, 0, 100);
      await versionStore.connect(admin).storeVersion(1, 1, author1.address, ethers.ZeroHash, 0, 200);

      const [versionIds, parentIds] = await versionStore.getVersionDAG(1);
      expect(versionIds.length).to.equal(2);
      expect(parentIds[0]).to.equal(0n); // root
      expect(parentIds[1]).to.equal(1n); // parent = version 1
    });
  });
});
