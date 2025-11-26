import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load DICE deployment info
const DICE_PATH = path.join(process.cwd(), 'src', 'deployments', 'DICE.json');
const DICE = JSON.parse(fs.readFileSync(DICE_PATH, 'utf-8'));

/**
 * Vercel Serverless Function for DICE Token Faucet
 * 
 * Environment variables required:
 * - FAUCET_PRIVATE_KEY: Private key of DICE token owner
 * - SEPOLIA_RPC_URL: Sepolia RPC endpoint
 * 
 * Usage: POST /api/faucet
 * Body: { "address": "0x..." }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;

    // Validate address
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    // Check environment variables
    const privateKey = process.env.FAUCET_PRIVATE_KEY;
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;

    if (!privateKey) {
      return res.status(500).json({ 
        error: 'Faucet not configured. FAUCET_PRIVATE_KEY environment variable is missing.' 
      });
    }

    if (!rpcUrl) {
      return res.status(500).json({ 
        error: 'RPC URL not configured. SEPOLIA_RPC_URL environment variable is missing.' 
      });
    }

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // Get DICE contract
    const diceContract = new ethers.Contract(
      DICE.address,
      DICE.abi,
      signer
    );

    // Check if signer is owner
    const owner = await diceContract.owner();
    if (signer.address.toLowerCase() !== owner.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Faucet signer is not the contract owner' 
      });
    }

    // Check if address already has tokens (optional rate limiting)
    const balance = await diceContract.balanceOf(address);
    const minBalance = ethers.parseEther('100'); // 100 DICE
    
    if (balance >= minBalance) {
      return res.status(400).json({ 
        error: 'Address already has sufficient DICE tokens. Please use existing tokens.' 
      });
    }

    // Mint tokens (default: 1000 DICE)
    const amount = ethers.parseEther('1000');
    
    console.log(`Minting ${ethers.formatEther(amount)} DICE to ${address}...`);
    
    const tx = await diceContract.mint(address, amount);
    await tx.wait();

    return res.status(200).json({
      success: true,
      transactionHash: tx.hash,
      amount: ethers.formatEther(amount),
      address: address
    });

  } catch (error: any) {
    console.error('Faucet error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to mint tokens' 
    });
  }
}

