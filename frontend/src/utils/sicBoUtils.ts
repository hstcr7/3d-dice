import { getFheInstance, initializeFheInstance } from './fhevm';
import { BrowserProvider, Contract, getAddress, ethers } from 'ethers';
import PrivateSicBo from '../deployments/PrivateSicBo.json';

export const CONTRACT_ADDRESS = PrivateSicBo.address;
const ABI = PrivateSicBo.abi;

export enum BetType {
    BigSmall = 0,       // a: 0=Small(4-10), 1=Big(11-17); triples lose
    SumExact = 1,       // a: 3..18
    AnyTriple = 2,      // no params
    SpecificTriple = 3, // a: 1..6
    SingleNumber = 4    // a: 1..6; payout depends on occurrences (1/2/3)
}

export interface RoundData {
    roundId: number;
    player: string;
    stakeWei: bigint;
    betType: BetType;
    a: number;
    b: number;
    dice: {
        d1: number | null;
        d2: number | null;
        d3: number | null;
    };
    encPayoutWei: bigint;
    settleRequested: boolean;
    settled: boolean;
    clearPayoutWei: bigint;
}

/**
 * Get contract instance
 */
export const getContract = (signerOrProvider: any) => {
    return new Contract(CONTRACT_ADDRESS, ABI, signerOrProvider);
};

/**
 * Get token address from contract
 */
export const getTokenAddress = async (provider: BrowserProvider): Promise<string> => {
    try {
        const contract = getContract(provider);
        const tokenAddress = await contract.token();
        return tokenAddress;
    } catch (error: any) {
        console.error("Get token address error:", error);
        throw error;
    }
};

/**
 * Get ERC20 token contract
 */
export const getTokenContract = (tokenAddress: string, signerOrProvider: any) => {
    const tokenABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
    ];
    return new Contract(tokenAddress, tokenABI, signerOrProvider);
};

/**
 * Approve token spending
 */
export const approveToken = async (
    tokenAddress: string,
    contractAddress: string,
    amount: bigint,
    signer: any
): Promise<boolean> => {
    try {
        const tokenContract = getTokenContract(tokenAddress, signer);
        const tx = await tokenContract.approve(contractAddress, amount);
        await tx.wait();
        return true;
    } catch (error: any) {
        console.error("Approve token error:", error);
        throw error;
    }
};

/**
 * Get token balance
 */
export const getTokenBalance = async (
    tokenAddress: string,
    account: string,
    provider: BrowserProvider
): Promise<bigint> => {
    try {
        const tokenContract = getTokenContract(tokenAddress, provider);
        const balance = await tokenContract.balanceOf(account);
        return balance;
    } catch (error: any) {
        console.error("Get token balance error:", error);
        return 0n;
    }
};

/**
 * Get token allowance
 */
export const getTokenAllowance = async (
    tokenAddress: string,
    owner: string,
    spender: string,
    provider: BrowserProvider
): Promise<bigint> => {
    try {
        const tokenContract = getTokenContract(tokenAddress, provider);
        const allowance = await tokenContract.allowance(owner, spender);
        return allowance;
    } catch (error: any) {
        console.error("Get token allowance error:", error);
        return 0n;
    }
};

/**
 * Get token decimals
 */
export const getTokenDecimals = async (
    tokenAddress: string,
    provider: BrowserProvider
): Promise<number> => {
    try {
        const tokenContract = getTokenContract(tokenAddress, provider);
        const decimals = await tokenContract.decimals();
        return Number(decimals);
    } catch (error: any) {
        console.error("Get token decimals error:", error);
        return 18; // Default to 18
    }
};

/**
 * Place a bet (with token)
 */
export const placeBet = async (
    betType: BetType,
    a: number,
    b: number,
    stakeAmount: bigint, // Token amount (in token's smallest unit)
    signer: any
): Promise<number> => {
    try {
        const contract = getContract(signer);
        
        // Check if token is set
        const tokenAddress = await contract.token();
        if (tokenAddress === ethers.ZeroAddress) {
            throw new Error("Token not set in contract");
        }

        // Check allowance and approve if needed
        const provider = new BrowserProvider(window.ethereum);
        const account = await signer.getAddress();
        const allowance = await getTokenAllowance(tokenAddress, account, CONTRACT_ADDRESS, provider);
        
        if (allowance < stakeAmount) {
            // Approve more than needed to avoid multiple approvals
            const approveAmount = stakeAmount * 10n; // Approve 10x for future bets
            await approveToken(tokenAddress, CONTRACT_ADDRESS, approveAmount, signer);
        }
        
        const tx = await contract.bet(betType, a, b, stakeAmount);
        await tx.wait();
        
        // Get round ID
        const roundId = await contract.roundsCount();
        return Number(roundId);
    } catch (error: any) {
        console.error("Place bet error:", error);
        throw error;
    }
};

/**
 * Get dice handles for a round
 */
export const getDiceHandles = async (
    roundId: number,
    provider: BrowserProvider
): Promise<[bigint, bigint, bigint]> => {
    try {
        const contract = getContract(provider);
        const [d1, d2, d3] = await contract.getDiceHandles(roundId);
        return [d1, d2, d3];
    } catch (error: any) {
        console.error("Get dice handles error:", error);
        throw error;
    }
};

/**
 * Decrypt dice values (batch decrypt - 1 signature for all 3 dice)
 */
export const decryptDice = async (
    diceHandles: [bigint, bigint, bigint],
    account: string
): Promise<[number, number, number] | null> => {
    try {
        const instance = await initializeFheInstance();
        const checksummedContractAddress = getAddress(CONTRACT_ADDRESS);
        const checksummedUserAddress = getAddress(account);

        const keypair = instance.generateKeypair();
        const handleContractPairs = [
            { handle: diceHandles[0].toString(), contractAddress: checksummedContractAddress },
            { handle: diceHandles[1].toString(), contractAddress: checksummedContractAddress },
            { handle: diceHandles[2].toString(), contractAddress: checksummedContractAddress },
        ];

        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = "10";
        const contractAddresses = [checksummedContractAddress];

        const eip712 = instance.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimeStamp,
            durationDays
        );

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const signature = await signer.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
            eip712.message
        );

        const result = await instance.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace("0x", ""),
            contractAddresses,
            checksummedUserAddress,
            startTimeStamp,
            durationDays
        );

        const d1 = result[diceHandles[0].toString()];
        const d2 = result[diceHandles[1].toString()];
        const d3 = result[diceHandles[2].toString()];

        if (d1 !== undefined && d2 !== undefined && d3 !== undefined) {
            return [Number(d1), Number(d2), Number(d3)];
        }
        return null;
    } catch (error: any) {
        console.error("Decrypt dice error:", error);
        return null;
    }
};

/**
 * Request settlement
 */
export const requestSettle = async (
    roundId: number,
    signer: any
): Promise<boolean> => {
    try {
        const contract = getContract(signer);
        const tx = await contract.requestSettle(roundId);
        await tx.wait();
        return true;
    } catch (error: any) {
        console.error("Request settle error:", error);
        throw error;
    }
};

/**
 * Public decrypt payout and finalize settlement
 */
export const finalizeSettle = async (
    roundId: number,
    account: string,
    signer: any
): Promise<boolean> => {
    try {
        const contract = getContract(signer);
        const instance = await initializeFheInstance();
        const checksummedContractAddress = getAddress(CONTRACT_ADDRESS);

        // Get encrypted payout handle
        const encPayoutHandle = await contract.getEncryptedPayoutHandle(roundId);
        
        // Convert handle to string if it's bigint
        const handleStr = typeof encPayoutHandle === 'bigint' 
            ? encPayoutHandle.toString() 
            : encPayoutHandle;

        // Public decrypt (no signature needed)
        // Format: array of handle strings (same as example script)
        const result = await instance.publicDecrypt([handleStr]);

        // Finalize on-chain
        const tx = await contract.finalizeSettle(
            roundId,
            result.abiEncodedClearValues,
            result.decryptionProof
        );
        await tx.wait();
        return true;
    } catch (error: any) {
        console.error("Finalize settle error:", error);
        throw error;
    }
};

/**
 * Get round data
 */
export const getRoundData = async (
    roundId: number,
    provider: BrowserProvider
): Promise<RoundData | null> => {
    try {
        const contract = getContract(provider);
        const round = await contract.rounds(roundId);
        
        return {
            roundId,
            player: round.player,
            stakeWei: round.stakeWei,
            betType: Number(round.betType),
            a: Number(round.a),
            b: Number(round.b),
            dice: {
                d1: null,
                d2: null,
                d3: null,
            },
            encPayoutWei: round.encPayoutWei,
            settleRequested: round.settleRequested,
            settled: round.settled,
            clearPayoutWei: round.clearPayoutWei,
        };
    } catch (error: any) {
        console.error("Get round data error:", error);
        return null;
    }
};

/**
 * Get player's rounds
 */
export const getPlayerRounds = async (
    playerAddress: string,
    provider: BrowserProvider
): Promise<number[]> => {
    try {
        const contract = getContract(provider);
        const rounds = await contract.getPlayerRounds(playerAddress);
        return rounds.map((r: bigint) => Number(r));
    } catch (error: any) {
        console.error("Get player rounds error:", error);
        return [];
    }
};

/**
 * Get total rounds count
 */
export const getRoundsCount = async (
    provider: BrowserProvider
): Promise<number> => {
    try {
        const contract = getContract(provider);
        const count = await contract.roundsCount();
        return Number(count);
    } catch (error: any) {
        console.error("Get rounds count error:", error);
        return 0;
    }
};

