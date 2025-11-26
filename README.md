# 🎲 Private SicBo - FHEVM Powered 3 Dice Game

A fully private SicBo (3 dice) game built on **FHEVM** (Fully Homomorphic Encryption Virtual Machine), featuring encrypted on-chain operations, ERC20 token support, and a modern 3D animated UI.

![Private SicBo Game Interface](./image.png)

## ✨ Features

- **🔒 Fully Private**: Dice rolls and payouts are encrypted on-chain using FHEVM
- **🎲 3D Dice Animation**: Beautiful 3D animated dice with rolling effects and proper dot patterns
- **💰 ERC20 Token Support**: Uses DICE token for betting instead of ETH
- **🎯 Multiple Bet Types**: 
  - Big/Small (4-10 vs 11-17)
  - Sum Exact (bet on exact sum 3-18)
  - Any Triple (any matching triple)
  - Specific Triple (specific number triple)
  - Single Number (bet on a specific number appearing)
- **🎨 Modern UI**: Dark theme with glass morphism, gradients, and smooth animations
- **📊 History Table**: Clean table layout for viewing all rounds with status indicators
- **💾 Local Caching**: Dice values cached to avoid repeated decryption signatures
- **🎰 Chip Selector**: Quick stake selection with preset amounts.

## 📍 Contract Addresses

### Sepolia Testnet

- **PrivateSicBo Contract**: `0x70E0D7cB0ac98543eE7Ecadf25846bD9345B0ca6`
- **DICE Token**: `0x3F0ECEba638774FcFB5b1d77bBBD37225184E63B`

View on [Sepolia Etherscan](https://sepolia.etherscan.io/):
- [PrivateSicBo](https://sepolia.etherscan.io/address/0x70E0D7cB0ac98543eE7Ecadf25846bD9345B0ca6)
- [DICE Token](https://sepolia.etherscan.io/address/0x3F0ECEba638774FcFB5b1d77bBBD37225184E63B)

## 🏗️ Architecture

### Smart Contracts
- **PrivateSicBo.sol**: Main game contract with FHE operations for encrypted dice rolls and payouts
- **DICE.sol**: ERC20 token contract (18 decimals) for betting

### Frontend
- **React + TypeScript**: Modern frontend framework
- **Ethers.js v6**: Ethereum interaction library
- **FHEVM Relayer SDK**: For encryption/decryption operations
- **Tailwind CSS**: Styling with custom gaming theme
- **3D Dice Component**: Custom animated dice with CSS 3D transforms

## 📋 Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Access to Sepolia testnet
- FHEVM Relayer access (for encryption/decryption)
- Sepolia ETH for gas fees

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd 3dice
```

### 2. Install Dependencies

```bash
# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment

Create `.env` file in `contracts/` directory:

```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### 4. Deploy Contracts (Optional - contracts already deployed)

If you want to deploy your own contracts:

```bash
cd contracts

# Deploy DICE token
npm run deploy:dice

# Deploy PrivateSicBo contract
npm run deploy:sicbo

# Set token address in contract
npm run set:token

# Fund contract with DICE tokens
npm run fund:contract

# Or run all setup at once
npm run setup:all
```

**Note**: Contract addresses are automatically saved to `frontend/src/deployments/` JSON files.

### 5. Run Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## 💧 Getting DICE Tokens (Faucet)

The faucet is **automatically available** when deployed to Vercel with proper configuration.

### For Users:
- Click the **"Faucet"** button in the navbar (green button with droplet icon)
- The system will automatically mint **1000 DICE tokens** to your address
- Rate limiting: You can only request tokens if your balance is below 100 DICE

### For Deployment (Vercel):

To enable automatic faucet, you **must** configure these environment variables in Vercel Dashboard:

**Required Environment Variables:**
1. **FAUCET_PRIVATE_KEY**: Private key of the DICE token owner (who can mint tokens)
2. **SEPOLIA_RPC_URL**: Sepolia RPC endpoint (e.g., from Infura, Alchemy, or public RPC)

**Setup Steps in Vercel Dashboard:**
1. Go to your Vercel project
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New** and add each variable:
   - **Name**: `FAUCET_PRIVATE_KEY`
     - **Value**: Your DICE token owner's private key (without `0x` prefix)
     - **Environment**: Production, Preview, Development (select all)
   - **Name**: `SEPOLIA_RPC_URL`
     - **Value**: `https://sepolia.infura.io/v3/YOUR_INFURA_KEY` or `https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY`
     - **Environment**: Production, Preview, Development (select all)
4. **Important**: After adding variables, you need to **redeploy** your project for changes to take effect
5. Go to **Deployments** tab → Click **⋯** on latest deployment → **Redeploy**

**Alternative: Manual Mint Script**
If you prefer not to use the automatic faucet, contract owner can mint tokens manually:

```bash
cd contracts
npm run faucet -- <user_address> [amount]
# Example: npm run faucet -- 0x123... 1000
# Default amount: 1000 DICE tokens
```

## 🎮 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Get DICE Tokens**: Use the Faucet button or contact owner to receive test tokens
3. **Approve Tokens**: Click "Approve" to allow the contract to spend your DICE tokens (one-time setup)
4. **Place Bet**:
   - Select bet type (Big/Small, Sum Exact, etc.)
   - Choose your bet parameters (Small/Big, number, sum, etc.)
   - Select stake using chip buttons (1, 5, 10, 50, 100) or enter custom amount (max 18 DICE)
   - Click "Place Bet"
4. **Decrypt Dice**: Click "🔐 Decrypt" button on your round to reveal the dice results (requires signature)
5. **Settle**: Click "💰 Settle" to request settlement, then "✅ Finalize" to complete and receive payout
6. **View Results**: Check your rounds table for win/loss status and payout amounts

## 🎲 Bet Types Explained

### Big/Small
- **Small**: Sum of 4-10 (loses on any triple)
- **Big**: Sum of 11-17 (loses on any triple)
- **Payout**: 1:1

### Sum Exact
- Bet on exact sum of three dice (3-18)
- **Payout**: Varies by sum (higher for rare sums like 3 or 18)

### Any Triple
- All three dice show the same number (1-1-1, 2-2-2, etc.)
- **Payout**: 30:1

### Specific Triple
- All three dice show a specific number (e.g., 3-3-3)
- **Payout**: 180:1

### Single Number
- A specific number appears on at least one die
- **Payout**: 1:1 per occurrence (1 die = 1x, 2 dice = 2x, 3 dice = 3x)

## 🔧 Technical Details

### FHEVM Integration
- Dice values are encrypted as `euint8` on-chain
- Payouts computed in encrypted form (`euint64`)
- Public decryption for payouts (anyone can decrypt)
- User decryption for dice (requires user's private key signature)

### Randomness
The contract uses a hash chain with multiple entropy sources for improved randomness:
- Block timestamp
- Block prevrandao
- Transaction counter
- Sender address
- Block number
- Block gas limit
- Gas left
- Die index

This ensures each die roll has unique entropy and prevents predictable patterns.

### Security Features
- Maximum stake limit (18 DICE) to prevent overflow in encrypted calculations
- Encrypted operations prevent front-running
- On-chain verification of decryptions
- ERC20 token standard compliance
- Owner-only functions for contract configuration

## 📁 Project Structure

```
3dice/
├── contracts/
│   ├── contracts/
│   │   ├── PrivateSicBo.sol      # Main game contract
│   │   ├── DICE.sol               # ERC20 token
│   │   └── IERC20.sol             # ERC20 interface
│   ├── scripts/
│   │   ├── deploy-sicbo.ts        # Deploy game contract
│   │   ├── deploy-dice.ts         # Deploy token
│   │   ├── set-token.ts           # Set token address
│   │   └── fund-contract.ts       # Fund contract
│   ├── SETUP_GUIDE.md             # Detailed setup instructions
│   └── hardhat.config.ts
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main app component
│   │   ├── components/
│   │   │   ├── Dice3D.tsx         # 3D dice component
│   │   │   ├── BettingBoard.tsx   # Betting interface
│   │   │   ├── HistoryTable.tsx   # Rounds history table
│   │   │   ├── Navbar.tsx         # Header with wallet
│   │   │   └── FhevmProvider.tsx  # FHEVM context
│   │   ├── utils/
│   │   │   ├── sicBoUtils.ts      # Contract utilities
│   │   │   └── fhevm.ts           # FHEVM setup
│   │   ├── deployments/           # Contract deployment JSONs
│   │   └── main.tsx
│   └── package.json
└── README.md
```

## 🎨 UI Features

- **3D Dice Animation**: Realistic 3D dice with proper dot patterns and rolling animation
- **Gradient Backgrounds**: Modern purple gradient theme with glass morphism
- **Chip Selector**: Quick stake selection with visual feedback
- **Table Layout**: Clean table view for rounds with status icons
- **Hover Effects**: Interactive buttons and cards
- **Responsive Design**: Works on desktop and mobile
- **Status Indicators**: Visual status badges (trophy for win, X for loss, clock for pending)
- **Message Notifications**: User-friendly error and success messages

## 🐛 Troubleshooting

### "Stake too large" Error
- Maximum stake is 18 DICE tokens
- Reduce your stake amount or use chip selector

### Decryption Fails
- Ensure you have FHEVM Relayer access
- Check browser console for errors
- Try refreshing and reconnecting wallet
- Verify you're on Sepolia testnet

### Contract Not Found
- Contract addresses are automatically loaded from `frontend/src/deployments/` JSON files
- Ensure you're on the correct network (Sepolia)
- Check that deployment files exist and are valid JSON

### Transaction Fails
- Check you have enough ETH for gas fees
- Verify token approval is sufficient (click Approve button)
- Ensure contract has enough DICE tokens for payouts
- Check network connection

### Dice Not Displaying
- Clear browser cache and localStorage
- Refresh the page
- Reconnect wallet

## 📝 Development

### Compile Contracts
```bash
cd contracts
npx hardhat compile
```

### Run Tests
```bash
cd contracts
npx hardhat test
```

### Build Frontend
```bash
cd frontend
npm run build
```

### Preview Production Build
```bash
cd frontend
npm run preview
```

## 🔐 Security Considerations

- This is a demonstration project - **not audited for production use**
- Private keys should **never** be committed to the repository
- Use testnet tokens only for testing
- FHEVM operations require relayer infrastructure
- Maximum stake is limited to prevent overflow
- Always verify contract addresses before interacting

## 📄 License

This project is for educational purposes. Use at your own risk.

## 🙏 Acknowledgments

- **FHEVM team** for the homomorphic encryption infrastructure
- **Zama** for FHE technology
- **OpenZeppelin** for ERC20 standard implementation

## 📞 Support

For issues or questions, please open an issue on the repository.

---

**Enjoy playing Private SicBo! 🎲🎲🎲**
