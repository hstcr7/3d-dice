import React from 'react';
import { RoundData } from '../utils/sicBoUtils';
import { Trophy, XCircle, Clock, Lock } from 'lucide-react';
import { DiceRoll } from './Dice3D';
import { ethers } from 'ethers';
import clsx from 'clsx';

interface HistoryTableProps {
  history: RoundData[];
  tokenDecimals: number;
  rollingDice: { [roundId: number]: boolean };
  onDecryptDice: (roundId: number) => void;
  onRequestSettle: (roundId: number) => void;
  onFinalizeSettle: (roundId: number) => void;
  loading: boolean;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ 
  history, 
  tokenDecimals,
  rollingDice,
  onDecryptDice,
  onRequestSettle,
  onFinalizeSettle,
  loading
}) => {
  
  const getBetTypeName = (betType: number): string => {
    switch (betType) {
      case 0: return 'Big/Small';
      case 1: return 'Sum Exact';
      case 2: return 'Any Triple';
      case 3: return 'Specific Triple';
      case 4: return 'Single Number';
      default: return 'Unknown';
    }
  };

  const getBetDescription = (betType: number, a: number): string => {
    switch (betType) {
      case 0: return a === 0 ? 'Small (4-10)' : 'Big (11-17)';
      case 1: return `Sum = ${a}`;
      case 2: return 'Any Triple';
      case 3: return `Triple ${a}`;
      case 4: return `Number ${a}`;
      default: return 'Unknown';
    }
  };

  return (
    <div className="w-full glass-panel rounded-xl overflow-hidden mt-8">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="font-display font-bold text-lg">Round History</h3>
        <span className="text-xs text-gray-400">{history.length} Rounds</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 text-gray-400 font-medium">
            <tr>
              <th className="px-4 py-3">Round ID</th>
              <th className="px-4 py-3">Bet</th>
              <th className="px-4 py-3">Stake</th>
              <th className="px-4 py-3 text-center">Dice</th>
              <th className="px-4 py-3 text-right">Payout</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                  No rounds played yet.
                </td>
              </tr>
            ) : (
              history.map((round) => (
                <tr key={round.roundId} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-300">#{round.roundId}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-bold">{getBetTypeName(round.betType)}</div>
                      <div className="text-xs text-gray-400">{getBetDescription(round.betType, round.a)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {ethers.formatUnits(round.stakeWei, tokenDecimals)} DICE
                  </td>
                  <td className="px-4 py-3 text-center">
                    {round.dice.d1 !== null ? (
                      <div className="flex justify-center">
                        <DiceRoll 
                          d1={round.dice.d1} 
                          d2={round.dice.d2} 
                          d3={round.dice.d3}
                          rolling={rollingDice[round.roundId] || false}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => onDecryptDice(round.roundId)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-gaming-500 hover:bg-gaming-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" />
                        Decrypt
                      </button>
                    )}
                  </td>
                  <td className={clsx(
                    "px-4 py-3 text-right font-mono font-bold",
                    round.settled 
                      ? (round.clearPayoutWei > 0n ? "text-green-400" : "text-red-400")
                      : "text-gray-500"
                  )}>
                    {round.settled 
                      ? (round.clearPayoutWei > 0n 
                          ? `+${ethers.formatUnits(round.clearPayoutWei, tokenDecimals)}` 
                          : 'Lost')
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      {round.settled ? (
                        round.clearPayoutWei > 0n ? (
                          <Trophy className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )
                      ) : round.settleRequested ? (
                        <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      {!round.settleRequested && !round.settled && (
                        <button
                          onClick={() => onRequestSettle(round.roundId)}
                          disabled={loading || round.dice.d1 === null}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          Settle
                        </button>
                      )}
                      {round.settleRequested && !round.settled && (
                        <button
                          onClick={() => onFinalizeSettle(round.roundId)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          Finalize
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;

