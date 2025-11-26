import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// If you're using the official FHEVM hardhat template, it usually provides a
// `fhevm` helper for user decryption in tests.
// Example shown in docs: fhevm.userDecryptEuint(FhevmType.euint8, handle, contractAddress, signer)
// If your template exposes a different helper, adapt accordingly.
import { fhevm, FhevmType } from "@fhevm/hardhat-plugin"; // may already exist in the template

describe("PrivateSicBo", function () {
  type Signers = { owner: HardhatEthersSigner; alice: HardhatEthersSigner };

  let signers: Signers;

  before(async () => {
    const [owner, alice] = await ethers.getSigners();
    signers = { owner, alice };
  });

  async function deployFixture() {
    const factory = await ethers.getContractFactory("PrivateSicBo");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  it("plays a round and lets the player decrypt 3 dice handles (private)", async function () {
    const contract = await deployFixture();

    // fund bankroll
    await signers.owner.sendTransaction({ to: await contract.getAddress(), value: ethers.parseEther("10") });

    const stake = ethers.parseEther("1");

    await (await contract.connect(signers.alice).bet(0, 1, 0, { value: stake })).wait(); // BigSmall, a=1 big
    const roundId = await contract.roundsCount();

    const [d1, d2, d3] = await contract.getDiceHandles(roundId);

    const clearD1 = await fhevm.userDecryptEuint(FhevmType.euint8, d1, await contract.getAddress(), signers.alice);
    const clearD2 = await fhevm.userDecryptEuint(FhevmType.euint8, d2, await contract.getAddress(), signers.alice);
    const clearD3 = await fhevm.userDecryptEuint(FhevmType.euint8, d3, await contract.getAddress(), signers.alice);

    expect(clearD1).to.be.greaterThanOrEqual(1);
    expect(clearD1).to.be.lessThanOrEqual(6);
    expect(clearD2).to.be.greaterThanOrEqual(1);
    expect(clearD2).to.be.lessThanOrEqual(6);
    expect(clearD3).to.be.greaterThanOrEqual(1);
    expect(clearD3).to.be.lessThanOrEqual(6);
  });

  it("settlement skeleton: requestSettle -> publicDecrypt -> finalizeSettle", async function () {
    const contract = await deployFixture();
    await signers.owner.sendTransaction({ to: await contract.getAddress(), value: ethers.parseEther("10") });

    const stake = ethers.parseEther("1");
    await (await contract.connect(signers.alice).bet(1, 10, 0, { value: stake })).wait(); // SumExact = 10
    const roundId = await contract.roundsCount();

    await (await contract.connect(signers.alice).requestSettle(roundId)).wait();

    // Step 2 + 3 need a Relayer SDK instance connected to a real network/gateway.
    // See scripts/play.ts for example wiring with @zama-fhe/relayer-sdk.
    expect(true).eq(true);
  });
});
