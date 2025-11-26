import React from 'react';
import { Wallet, Dices } from 'lucide-react';
import { ethers } from 'ethers';

interface NavbarProps {
  balance: bigint;
  decimals: number;
  address: string | null;
  onConnect: () => void;
  loading: boolean;
  onApprove?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ balance, decimals, address, onConnect, loading, onApprove }) => {
  return (
    <nav className="w-full h-20 px-6 flex items-center justify-between border-b border-white/10 glass-panel sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-gaming-500 p-2 rounded-lg shadow-[0_0_15px_rgba(109,40,217,0.5)]">
          <Dices className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-wide bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            PRIVATE SICBO
          </h1>
          <span className="text-xs text-gaming-accent font-mono tracking-wider">FHEVM POWERED</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {address && (
           <div className="hidden md:flex flex-col items-end mr-4">
             <span className="text-xs text-gray-400">Balance</span>
             <span className="font-mono font-bold text-gaming-accent">
               {balance > 0n ? ethers.formatUnits(balance, decimals) : '0'} DICE
             </span>
           </div>
        )}
        
        {address && onApprove && (
          <button 
            onClick={onApprove}
            disabled={loading}
            className="px-4 py-2 bg-gaming-700 hover:bg-gaming-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        )}
        
        <button 
          onClick={onConnect}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gaming-500 hover:bg-gaming-400 rounded-full font-medium transition-all shadow-lg hover:shadow-gaming-500/25 active:scale-95 disabled:opacity-50"
        >
          <Wallet className="w-4 h-4" />
          {loading ? 'Connecting...' : address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

