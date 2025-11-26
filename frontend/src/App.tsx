import { useState, useEffect } from 'react'
import { BrowserProvider } from 'ethers'
import { useFhevm } from './components/FhevmProvider'
import { Dice3D } from './components/Dice3D'
import Navbar from './components/Navbar'
import BettingBoard from './components/BettingBoard'
import HistoryTable from './components/HistoryTable'
import { 
    BetType,
    RoundData,
    placeBet,
    getDiceHandles,
    decryptDice,
    requestSettle,
    finalizeSettle,
    getRoundData,
    getPlayerRounds,
    getTokenAddress,
    getTokenBalance,
    getTokenDecimals,
    approveToken,
    CONTRACT_ADDRESS,
} from './utils/sicBoUtils'
import { ethers } from 'ethers'
import clsx from 'clsx'

function App() {
    const { isInitialized, account, connect } = useFhevm();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string>('');
    const [stakeAmount, setStakeAmount] = useState('1');
    const [selectedBetType, setSelectedBetType] = useState<BetType>(BetType.BigSmall);
    const [betParamA, setBetParamA] = useState<number>(1);
    const [playerRounds, setPlayerRounds] = useState<RoundData[]>([]);
    const [tokenAddress, setTokenAddress] = useState<string>('');
    const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
    const [tokenDecimals, setTokenDecimals] = useState<number>(18);
    const [rollingDice, setRollingDice] = useState<{ [roundId: number]: boolean }>({});
    const [gameStage, setGameStage] = useState<'IDLE' | 'PLACED' | 'ROLLING' | 'DECRYPTING' | 'SETTLING' | 'FINISHED'>('IDLE');

    useEffect(() => {
        if (isInitialized && account) {
            loadTokenInfo();
            loadPlayerRounds();
        }
    }, [isInitialized, account]);

    const loadTokenInfo = async () => {
        if (!window.ethereum || !account) return;
        try {
            const provider = new BrowserProvider(window.ethereum);
            const tokenAddr = await getTokenAddress(provider);
            setTokenAddress(tokenAddr);
            
            if (tokenAddr && tokenAddr !== ethers.ZeroAddress) {
                const decimals = await getTokenDecimals(tokenAddr, provider);
                setTokenDecimals(decimals);
                
                const balance = await getTokenBalance(tokenAddr, account, provider);
                setTokenBalance(balance);
            }
        } catch (error: any) {
            console.error("Load token info error:", error);
        }
    };

    const loadPlayerRounds = async () => {
        if (!window.ethereum || !account) return;
        try {
            setLoading(true);
            const provider = new BrowserProvider(window.ethereum);
            const roundIds = await getPlayerRounds(account, provider);
            
            const diceCacheKey = `dice_cache_${account}`;
            const cachedDice = JSON.parse(localStorage.getItem(diceCacheKey) || '{}');
            
            const rounds: RoundData[] = [];
            for (const roundId of roundIds) {
                const round = await getRoundData(roundId, provider);
                if (round) {
                    if (round.dice.d1 === null && cachedDice[roundId]) {
                        round.dice = cachedDice[roundId];
                    }
                    rounds.push(round);
                }
            }
            setPlayerRounds(rounds.reverse());
        } catch (error: any) {
            console.error("Load rounds error:", error);
            setMessage("Error loading rounds: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceBet = async () => {
        if (!window.ethereum || !account) return;
        if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
            setMessage("Error: Token not set in contract");
            return;
        }
        
        const stakeNum = parseFloat(stakeAmount);
        if (isNaN(stakeNum) || stakeNum <= 0) {
            setMessage("Error: Invalid stake amount");
            return;
        }
        if (stakeNum > 18) {
            setMessage("Error: Maximum stake is 18 DICE tokens");
            return;
        }
        
        setLoading(true);
        setGameStage('ROLLING');
        try {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            const stakeAmountBigInt = ethers.parseUnits(stakeAmount, tokenDecimals);
            const maxStake = 18n * 10n**18n;
            if (stakeAmountBigInt > maxStake) {
                setMessage("Error: Stake amount too large (max 18 DICE)");
                setLoading(false);
                setGameStage('IDLE');
                return;
            }
            
            const roundId = await placeBet(selectedBetType, betParamA, 0, stakeAmountBigInt, signer);
            setMessage(`Bet placed! Round ID: ${roundId}`);
            
            await loadTokenInfo();
            await new Promise(resolve => setTimeout(resolve, 2000));
            await loadPlayerRounds();
            setGameStage('DECRYPTING');
        } catch (error: any) {
            console.error("Place bet error:", error);
            setMessage("Bet failed: " + error.message);
            setGameStage('IDLE');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveToken = async () => {
        if (!window.ethereum || !account || !tokenAddress) return;
        setLoading(true);
        try {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            const approveAmount = ethers.parseUnits("1000000", tokenDecimals);
            await approveToken(tokenAddress, CONTRACT_ADDRESS, approveAmount, signer);
            setMessage("Token approved successfully!");
            await loadTokenInfo();
        } catch (error: any) {
            console.error("Approve token error:", error);
            setMessage("Approve failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDecryptDice = async (roundId: number) => {
        if (!window.ethereum || !account) return;
        setLoading(true);
        
        setRollingDice(prev => ({ ...prev, [roundId]: true }));
        
        try {
            const provider = new BrowserProvider(window.ethereum);
            const [d1, d2, d3] = await getDiceHandles(roundId, provider);
            const decrypted = await decryptDice([d1, d2, d3], account);
            
            if (decrypted) {
                const diceCacheKey = `dice_cache_${account}`;
                const cachedDice = JSON.parse(localStorage.getItem(diceCacheKey) || '{}');
                cachedDice[roundId] = {
                    d1: decrypted[0],
                    d2: decrypted[1],
                    d3: decrypted[2],
                };
                localStorage.setItem(diceCacheKey, JSON.stringify(cachedDice));
                
                setTimeout(() => {
                    setRollingDice(prev => ({ ...prev, [roundId]: false }));
                }, 1000);
                
                setMessage(`Dice: ${decrypted[0]}, ${decrypted[1]}, ${decrypted[2]}`);
                await loadPlayerRounds();
            } else {
                setRollingDice(prev => ({ ...prev, [roundId]: false }));
                setMessage("Failed to decrypt dice");
            }
        } catch (error: any) {
            console.error("Decrypt dice error:", error);
            setRollingDice(prev => ({ ...prev, [roundId]: false }));
            setMessage("Decrypt failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSettle = async (roundId: number) => {
        if (!window.ethereum || !account) return;
        setLoading(true);
        try {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            await requestSettle(roundId, signer);
            setMessage("Settlement requested! Now finalizing...");
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            await handleFinalizeSettle(roundId);
        } catch (error: any) {
            console.error("Request settle error:", error);
            setMessage("Request settle failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizeSettle = async (roundId: number) => {
        if (!window.ethereum || !account) return;
        setLoading(true);
        try {
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            await finalizeSettle(roundId, account, signer);
            setMessage("Settlement finalized! Check your wallet for payout.");
            await loadPlayerRounds();
            await loadTokenInfo();
        } catch (error: any) {
            console.error("Finalize settle error:", error);
            setMessage("Finalize failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-20 font-sans">
            <Navbar 
                balance={tokenBalance} 
                decimals={tokenDecimals}
                address={account} 
                onConnect={connect} 
                loading={loading}
                onApprove={handleApproveToken}
            />

            {message && (
                <div className={clsx(
                    "container mx-auto px-4 pt-4 animate-in slide-in-from-top-2",
                    message.includes('Error') || message.includes('failed') 
                        ? "text-red-300" 
                        : "text-green-300"
                )}>
                    <div className={clsx(
                        "p-3 rounded-lg border flex items-center justify-between",
                        message.includes('Error') || message.includes('failed')
                            ? "bg-red-500/20 border-red-500"
                            : "bg-green-500/20 border-green-500"
                    )}>
                        <span>{message}</span>
                        <button
                            onClick={() => setMessage('')}
                            className="ml-4 text-current opacity-70 hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <main className="container mx-auto px-4 pt-8 max-w-7xl">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Column: Visuals & Controls */}
                    <div className="w-full lg:w-2/5 flex flex-col gap-6">
                        {/* Dice Container */}
                        <div className="glass-panel p-8 rounded-2xl flex justify-center items-center min-h-[280px] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gaming-500/10 blur-3xl group-hover:bg-gaming-500/20 transition-all duration-1000"></div>
                            
                            <div className="relative z-10 flex gap-6 md:gap-8 items-center justify-center">
                                {(() => {
                                    const latestRound = playerRounds[0];
                                    const dice = latestRound?.dice;
                                    const isRolling = latestRound && rollingDice[latestRound.roundId];
                                    
                                    if (dice && dice.d1 !== null && dice.d2 !== null && dice.d3 !== null) {
                                        return (
                                            <>
                                                <Dice3D value={dice.d1} rolling={isRolling || false} size={80} />
                                                <Dice3D value={dice.d2} rolling={isRolling || false} size={80} />
                                                <Dice3D value={dice.d3} rolling={isRolling || false} size={80} />
                                            </>
                                        );
                                    }
                                    return (
                                        <>
                                            <Dice3D value={1} rolling={false} size={80} />
                                            <Dice3D value={1} rolling={false} size={80} />
                                            <Dice3D value={1} rolling={false} size={80} />
                                        </>
                                    );
                                })()}
                            </div>

                            {(() => {
                                const latestRound = playerRounds[0];
                                const dice = latestRound?.dice;
                                if (dice && dice.d1 !== null && dice.d2 !== null && dice.d3 !== null) {
                                    const sum = dice.d1 + dice.d2 + dice.d3;
                                    return (
                                        <div className="absolute bottom-4 left-0 w-full text-center">
                                            <div className="inline-block px-4 py-1.5 rounded-full bg-black/60 text-white font-bold text-sm backdrop-blur-md border border-white/20 shadow-lg">
                                                SUM: {sum}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Betting Board */}
                        <BettingBoard
                            selectedBetType={selectedBetType}
                            betParamA={betParamA}
                            stakeAmount={stakeAmount}
                            onBetTypeChange={(type) => {
                                setSelectedBetType(type);
                                if (type === BetType.BigSmall) {
                                    setBetParamA(1);
                                } else if (type === BetType.SumExact) {
                                    setBetParamA(10);
                                } else if (type === BetType.SpecificTriple || type === BetType.SingleNumber) {
                                    setBetParamA(1);
                                }
                            }}
                            onBetParamChange={setBetParamA}
                            onStakeChange={setStakeAmount}
                            onPlaceBet={handlePlaceBet}
                            disabled={gameStage !== 'IDLE' && gameStage !== 'PLACED'}
                            loading={loading}
                        />
                    </div>

                    {/* Right Column: History */}
                    <div className="w-full lg:w-3/5">
                        <HistoryTable
                            history={playerRounds}
                            tokenDecimals={tokenDecimals}
                            rollingDice={rollingDice}
                            onDecryptDice={handleDecryptDice}
                            onRequestSettle={handleRequestSettle}
                            onFinalizeSettle={handleFinalizeSettle}
                            loading={loading}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
