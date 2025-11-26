import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
        console.error("❌ Error: No signers found!");
        process.exit(1);
    }

    const deployer = signers[0];
    console.log("Funding contract with account:", deployer.address);

    // Load deployment info
    const sicboDeploymentPath = path.join(__dirname, "../../frontend/src/deployments/PrivateSicBo.json");
    const diceDeploymentPath = path.join(__dirname, "../../frontend/src/deployments/DICE.json");

    if (!fs.existsSync(sicboDeploymentPath)) {
        console.error("❌ Error: PrivateSicBo deployment file not found!");
        process.exit(1);
    }

    if (!fs.existsSync(diceDeploymentPath)) {
        console.error("❌ Error: DICE deployment file not found!");
        console.error("Please deploy DICE token first: npx hardhat run scripts/deploy-dice.ts --network sepolia");
        process.exit(1);
    }

    const sicboDeployment = JSON.parse(fs.readFileSync(sicboDeploymentPath, "utf-8"));
    const diceDeployment = JSON.parse(fs.readFileSync(diceDeploymentPath, "utf-8"));

    const sicboAddress = sicboDeployment.address;
    const diceAddress = diceDeployment.address;

    console.log(`PrivateSicBo contract: ${sicboAddress}`);
    console.log(`DICE token address: ${diceAddress}`);

    // Get contract instances
    const sicbo = await ethers.getContractAt("PrivateSicBo", sicboAddress);
    const dice = await ethers.getContractAt("DICE", diceAddress);

    // Check if token is set
    const tokenAddress = await sicbo.token();
    if (tokenAddress === ethers.ZeroAddress) {
        console.error("❌ Error: Token not set in PrivateSicBo contract!");
        console.error("Please set token first: npx hardhat run scripts/set-token.ts --network sepolia");
        process.exit(1);
    }

    if (tokenAddress.toLowerCase() !== diceAddress.toLowerCase()) {
        console.error(`❌ Error: Token mismatch!`);
        console.error(`   Contract token: ${tokenAddress}`);
        console.error(`   DICE token: ${diceAddress}`);
        process.exit(1);
    }

    // Check deployer balance
    const deployerBalance = await dice.balanceOf(deployer.address);
    console.log(`\n💰 Deployer DICE balance: ${ethers.formatEther(deployerBalance)} DICE`);

    if (deployerBalance === 0n) {
        console.error("❌ Error: Deployer has no DICE tokens!");
        process.exit(1);
    }

    // Get amount to fund (default: 10% of balance, or use env variable)
    const fundPercentage = process.env.FUND_PERCENTAGE ? parseFloat(process.env.FUND_PERCENTAGE) : 0.1;
    const fundAmount = deployerBalance * BigInt(Math.floor(fundPercentage * 100)) / 100n;
    
    // Or use explicit amount from env
    const explicitAmount = process.env.FUND_AMOUNT;
    const finalAmount = explicitAmount ? ethers.parseEther(explicitAmount) : fundAmount;

    console.log(`\n💸 Funding amount: ${ethers.formatEther(finalAmount)} DICE`);

    // Check current contract balance
    const contractBalance = await dice.balanceOf(sicboAddress);
    console.log(`   Current contract balance: ${ethers.formatEther(contractBalance)} DICE`);

    // Check allowance
    const allowance = await dice.allowance(deployer.address, sicboAddress);
    console.log(`   Current allowance: ${ethers.formatEther(allowance)} DICE`);

    if (allowance < finalAmount) {
        console.log("\n🔓 Approving tokens...");
        const approveTx = await dice.approve(sicboAddress, finalAmount);
        console.log(`   Approve transaction: ${approveTx.hash}`);
        await approveTx.wait();
        console.log("✅ Approval confirmed");
    }

    // Fund contract
    console.log("\n💵 Funding contract...");
    const fundTx = await sicbo.fund(finalAmount);
    console.log(`   Fund transaction: ${fundTx.hash}`);
    await fundTx.wait();
    console.log("✅ Contract funded successfully!");

    // Verify new balance
    const newContractBalance = await dice.balanceOf(sicboAddress);
    console.log(`\n📊 New contract balance: ${ethers.formatEther(newContractBalance)} DICE`);
    console.log(`   Total funded: ${ethers.formatEther(newContractBalance - contractBalance)} DICE`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

