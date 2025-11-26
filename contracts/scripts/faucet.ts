import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Load DICE deployment info
const deploymentPath = path.join(__dirname, "../../frontend/src/deployments/DICE.json");
const DICE = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

/**
 * Faucet script to mint DICE tokens for users
 * Usage: npx hardhat run scripts/faucet.ts --network sepolia -- <address> [amount]
 * Example: npx hardhat run scripts/faucet.ts --network sepolia -- 0x123... 1000
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error("❌ Error: Please provide a recipient address");
        console.log("Usage: npx hardhat run scripts/faucet.ts --network sepolia -- <address> [amount]");
        console.log("Example: npx hardhat run scripts/faucet.ts --network sepolia -- 0x123... 1000");
        process.exit(1);
    }

    const recipient = args[0];
    const amount = args[1] ? parseFloat(args[1]) : 1000; // Default 1000 DICE

    if (!ethers.isAddress(recipient)) {
        console.error("❌ Error: Invalid address");
        process.exit(1);
    }

    const [signer] = await ethers.getSigners();
    console.log("Using account:", signer.address);

    // Check if signer is owner
    const diceContract = await ethers.getContractAt("DICE", DICE.address, signer);
    const owner = await diceContract.owner();
    
    if (signer.address.toLowerCase() !== owner.toLowerCase()) {
        console.error("❌ Error: Only contract owner can mint tokens");
        console.log(`Current signer: ${signer.address}`);
        console.log(`Contract owner: ${owner}`);
        process.exit(1);
    }

    const amountWei = ethers.parseUnits(amount.toString(), 18);
    console.log(`Minting ${amount} DICE tokens to ${recipient}...`);

    try {
        const tx = await diceContract.mint(recipient, amountWei);
        console.log(`Transaction hash: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Successfully minted ${amount} DICE tokens to ${recipient}`);
    } catch (error: any) {
        console.error("❌ Error minting tokens:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

