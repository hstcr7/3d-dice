import { ethers, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
        console.error("❌ Error: No signers found!");
        console.error("Please check your .env file in the contracts directory.");
        console.error("Make sure PRIVATE_KEY is set and is at least 64 characters long.");
        process.exit(1);
    }

    const deployer = signers[0];
    console.log("Deploying DICE token with the account:", deployer.address);

    // Deploy DICE token
    const dice = await ethers.deployContract("DICE", [deployer.address]);
    await dice.waitForDeployment();

    console.log(`✅ DICE token deployed to ${dice.target}`);
    console.log(`   Token name: ${await dice.name()}`);
    console.log(`   Token symbol: ${await dice.symbol()}`);
    console.log(`   Token decimals: ${await dice.decimals()}`);
    
    const totalSupply = await dice.totalSupply();
    console.log(`   Total supply: ${ethers.formatEther(totalSupply)} DICE`);
    console.log(`   Owner balance: ${ethers.formatEther(await dice.balanceOf(deployer.address))} DICE`);

    // Save deployment info to frontend
    const deploymentDir = path.join(__dirname, "../../frontend/src/deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const artifact = await artifacts.readArtifact("DICE");

    const deploymentData = {
        address: dice.target,
        abi: artifact.abi
    };

    const deploymentFile = path.join(deploymentDir, "DICE.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log(`\n📁 Deployment data saved to ${deploymentFile}`);

    console.log("\n📝 Next steps:");
    console.log("1. Set token address in PrivateSicBo contract:");
    console.log(`   npx hardhat run scripts/set-token.ts --network sepolia`);
    console.log("2. Fund PrivateSicBo contract with DICE tokens:");
    console.log(`   npx hardhat run scripts/fund-contract.ts --network sepolia`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

