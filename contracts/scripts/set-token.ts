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
    console.log("Setting token address with account:", deployer.address);

    // Load deployment info
    const sicboDeploymentPath = path.join(__dirname, "../../frontend/src/deployments/PrivateSicBo.json");
    const diceDeploymentPath = path.join(__dirname, "../../frontend/src/deployments/DICE.json");

    if (!fs.existsSync(sicboDeploymentPath)) {
        console.error("❌ Error: PrivateSicBo deployment file not found!");
        console.error(`Expected at: ${sicboDeploymentPath}`);
        process.exit(1);
    }

    if (!fs.existsSync(diceDeploymentPath)) {
        console.error("❌ Error: DICE deployment file not found!");
        console.error(`Expected at: ${diceDeploymentPath}`);
        console.error("Please deploy DICE token first: npx hardhat run scripts/deploy-dice.ts --network sepolia");
        process.exit(1);
    }

    const sicboDeployment = JSON.parse(fs.readFileSync(sicboDeploymentPath, "utf-8"));
    const diceDeployment = JSON.parse(fs.readFileSync(diceDeploymentPath, "utf-8"));

    const sicboAddress = sicboDeployment.address;
    const diceAddress = diceDeployment.address;

    console.log(`PrivateSicBo contract: ${sicboAddress}`);
    console.log(`DICE token address: ${diceAddress}`);

    // Get contract instance
    const sicbo = await ethers.getContractAt("PrivateSicBo", sicboAddress);

    // Check if token is already set
    const currentToken = await sicbo.token();
    if (currentToken !== ethers.ZeroAddress) {
        console.log(`⚠️  Token is already set to: ${currentToken}`);
        console.log("   Cannot set token again (contract only allows setting once)");
        process.exit(1);
    }

    // Check if deployer is owner
    const owner = await sicbo.owner();
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error(`❌ Error: Deployer (${deployer.address}) is not the contract owner!`);
        console.error(`   Contract owner is: ${owner}`);
        process.exit(1);
    }

    // Set token address
    console.log("\n🔧 Setting token address...");
    const tx = await sicbo.setToken(diceAddress);
    console.log(`   Transaction hash: ${tx.hash}`);
    
    await tx.wait();
    console.log("✅ Token address set successfully!");

    // Verify
    const newToken = await sicbo.token();
    console.log(`   Verified token address: ${newToken}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

