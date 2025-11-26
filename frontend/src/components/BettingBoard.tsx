import React from 'react';
import { BetType } from '../utils/sicBoUtils';
import clsx from 'clsx';
import { Coins } from 'lucide-react';

interface BettingBoardProps {
  selectedBetType: BetType;
  betParamA: number;
  stakeAmount: string;
  onBetTypeChange: (type: BetType) => void;
  onBetParamChange: (param: number) => void;
  onStakeChange: (amount: string) => void;
  onPlaceBet: () => void;
  disabled: boolean;
  loading: boolean;
}

const CHIPS = [1, 5, 10, 50, 100];

const BettingBoard: React.FC<BettingBoardProps> = ({ 
  selectedBetType, 
  betParamA, 
  stakeAmount,
  onBetTypeChange,
  onBetParamChange,
  onStakeChange,
  onPlaceBet,
  disabled,
  loading
}) => {
  
  const BettingButton: React.FC<{
    type: BetType;
    label: React.ReactNode;
    subLabel?: string;
    payout: number;
    className?: string;
    bgClass?: string;
    onClick: () => void;
    isSelected: boolean;
  }> = ({ 
    label, 
    subLabel, 
    payout, 
    className, 
    bgClass = "bg-gaming-700/50",
    onClick,
    isSelected
  }) => {
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={clsx(
          "relative group p-2 rounded-lg border border-gaming-500/30 transition-all duration-200 overflow-hidden",
          isSelected ? "bg-gaming-500 text-white shadow-[0_0_15px_rgba(109,40,217,0.5)] border-gaming-400" : `${bgClass} hover:bg-gaming-600/50 hover:border-gaming-400/50`,
          disabled && "opacity-50 cursor-not-allowed grayscale",
          className
        )}
      >
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <span className="font-display font-bold text-lg">{label}</span>
          {subLabel && <span className="text-xs opacity-70 mt-1">{subLabel}</span>}
          <div className="text-[10px] mt-1 font-mono text-gaming-accent opacity-80">1:{payout}</div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-4 md:p-6 shadow-2xl">
      <h2 className="text-xl font-bold mb-4">Place Your Bet</h2>
      
      {/* Bet Type Selection */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block">Bet Type</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <BettingButton
            type={BetType.BigSmall}
            label="Big/Small"
            subLabel="4-10 / 11-17"
            payout={1}
            onClick={() => onBetTypeChange(BetType.BigSmall)}
            isSelected={selectedBetType === BetType.BigSmall}
            className="h-20"
          />
          <BettingButton
            type={BetType.SumExact}
            label="Sum Exact"
            payout={6}
            onClick={() => onBetTypeChange(BetType.SumExact)}
            isSelected={selectedBetType === BetType.SumExact}
            className="h-20"
          />
          <BettingButton
            type={BetType.AnyTriple}
            label="Any Triple"
            payout={30}
            onClick={() => onBetTypeChange(BetType.AnyTriple)}
            isSelected={selectedBetType === BetType.AnyTriple}
            className="h-20"
            bgClass="bg-yellow-900/20"
          />
          <BettingButton
            type={BetType.SpecificTriple}
            label="Specific Triple"
            payout={180}
            onClick={() => onBetTypeChange(BetType.SpecificTriple)}
            isSelected={selectedBetType === BetType.SpecificTriple}
            className="h-20"
          />
          <BettingButton
            type={BetType.SingleNumber}
            label="Single Number"
            payout={1}
            onClick={() => onBetTypeChange(BetType.SingleNumber)}
            isSelected={selectedBetType === BetType.SingleNumber}
            className="h-20"
          />
        </div>
      </div>

      {/* Bet Parameters */}
      {selectedBetType === BetType.BigSmall && (
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Choose</label>
          <div className="grid grid-cols-2 gap-2">
            <BettingButton
              type={BetType.BigSmall}
              label="SMALL"
              subLabel="4 - 10"
              payout={1}
              onClick={() => onBetParamChange(0)}
              isSelected={betParamA === 0}
              className="h-16"
              bgClass="bg-blue-900/30"
            />
            <BettingButton
              type={BetType.BigSmall}
              label="BIG"
              subLabel="11 - 17"
              payout={1}
              onClick={() => onBetParamChange(1)}
              isSelected={betParamA === 1}
              className="h-16"
              bgClass="bg-red-900/30"
            />
          </div>
        </div>
      )}

      {selectedBetType === BetType.SumExact && (
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Sum (3-18)</label>
          <input
            type="number"
            min="3"
            max="18"
            value={betParamA}
            onChange={(e) => onBetParamChange(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gaming-800 border border-gaming-500/30 rounded-lg text-white focus:outline-none focus:border-gaming-400"
          />
        </div>
      )}

      {(selectedBetType === BetType.SpecificTriple || selectedBetType === BetType.SingleNumber) && (
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Number (1-6)</label>
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <BettingButton
                key={num}
                type={selectedBetType}
                label={<div className="text-2xl font-bold">{num}</div>}
                payout={selectedBetType === BetType.SpecificTriple ? 180 : 1}
                onClick={() => onBetParamChange(num)}
                isSelected={betParamA === num}
                className="aspect-square"
              />
            ))}
          </div>
        </div>
      )}

      {/* Chip Selector */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 mb-2 block font-medium uppercase tracking-wider">Select Chip Amount</label>
        <div className="flex justify-between gap-2 mb-3">
          {CHIPS.map(val => (
            <button
              key={val}
              onClick={() => onStakeChange(val.toString())}
              disabled={disabled || val > 18}
              className={clsx(
                "w-12 h-12 rounded-full flex items-center justify-center font-bold font-mono transition-all border-2",
                stakeAmount === val.toString()
                  ? "bg-white text-gaming-900 border-gaming-accent scale-110 shadow-[0_0_10px_white]" 
                  : "bg-gaming-800 text-gray-300 border-transparent hover:scale-105 hover:bg-gaming-700",
                (disabled || val > 18) && "opacity-50 cursor-not-allowed"
              )}
            >
              {val}
            </button>
          ))}
        </div>
        
        {/* Custom Stake Input */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Or Enter Custom Amount</label>
          <input
            type="text"
            value={stakeAmount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                onStakeChange(value);
              }
            }}
            placeholder="1"
            disabled={disabled}
            className="w-full px-4 py-2 bg-gaming-800 border border-gaming-500/30 rounded-lg text-white focus:outline-none focus:border-gaming-400 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">Max: 18 DICE</p>
        </div>
      </div>

      {/* Place Bet Button */}
      <div className="space-y-3">
        <button
          onClick={onPlaceBet}
          disabled={disabled || loading || !stakeAmount || parseFloat(stakeAmount) <= 0}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-gaming-500 to-indigo-600 hover:from-gaming-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-gaming-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Coins className="w-5 h-5" />
          {loading ? 'Placing...' : `Place Bet (${stakeAmount || '0'} DICE)`}
        </button>
        
        {/* Total Stake Display */}
        {stakeAmount && parseFloat(stakeAmount) > 0 && (
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-gaming-800/50 rounded-lg border border-gaming-500/30">
              <span className="text-xs text-gray-400 mr-2">Total Stake:</span>
              <span className="text-gaming-accent font-bold font-mono">{stakeAmount} DICE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BettingBoard;

