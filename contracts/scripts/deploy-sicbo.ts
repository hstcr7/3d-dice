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
    console.log("Deploying PrivateSicBo contract with the account:", deployer.address);

    const sicbo = await ethers.deployContract("PrivateSicBo");
    await sicbo.waitForDeployment();

    console.log(`PrivateSicBo deployed to ${sicbo.target}`);

    // Fund contract with initial bankroll (optional - can be done later via fund() function)
    // Uncomment below to auto-fund on deployment:
    // const fundAmount = ethers.parseEther("0.1"); // 0.1 ETH bankroll
    // const fundTx = await deployer.sendTransaction({
    //     to: await sicbo.getAddress(),
    //     value: fundAmount
    // });
    // await fundTx.wait();
    // console.log(`Funded contract with ${ethers.formatEther(fundAmount)} ETH`);
    console.log(`Note: Fund the contract later by calling fund() function with ETH`);

    // Save deployment info to frontend
    const deploymentDir = path.join(__dirname, "../../frontend/src/deployments");
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const artifact = await artifacts.readArtifact("PrivateSicBo");

    const deploymentData = {
        address: sicbo.target,
        abi: artifact.abi
    };

    const deploymentFile = path.join(deploymentDir, "PrivateSicBo.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log(`Deployment data saved to ${deploymentFile}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

