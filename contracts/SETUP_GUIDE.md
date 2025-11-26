# SicBo Game Setup Guide

Hướng dẫn setup đầy đủ cho SicBo game với DICE token.

## 📋 Prerequisites

1. Đã deploy PrivateSicBo contract (address: `0x7A49766BA80e18C907E62F0f608cDb05B9D08A6C` trên Sepolia)
2. Có `.env` file trong thư mục `contracts/` với:
   ```
   PRIVATE_KEY=your_private_key_here
   ```
3. Đã cài đặt dependencies:
   ```bash
   cd contracts
   npm install
   ```

## 🚀 Setup Steps

### Step 1: Deploy DICE Token

Deploy DICE ERC20 token contract:

```bash
cd contracts
npm run deploy:dice
```

Hoặc:

```bash
npx hardhat run scripts/deploy-dice.ts --network sepolia
```

**Output:**
- DICE token address sẽ được lưu vào `frontend/src/deployments/DICE.json`
- Token sẽ được mint 1 tỷ DICE tokens cho deployer

### Step 2: Set Token Address in PrivateSicBo

Set DICE token address vào PrivateSicBo contract (chỉ owner mới có thể set, và chỉ set được 1 lần):

```bash
npm run set:token
```

Hoặc:

```bash
npx hardhat run scripts/set-token.ts --network sepolia
```

**Lưu ý:**
- Script sẽ tự động đọc DICE token address từ deployment file
- Chỉ owner của PrivateSicBo contract mới có thể set token
- Token chỉ có thể set 1 lần duy nhất

### Step 3: Fund Contract with DICE Tokens

Fund PrivateSicBo contract với DICE tokens để có bankroll trả thưởng:

```bash
npm run fund:contract
```

Hoặc:

```bash
npx hardhat run scripts/fund-contract.ts --network sepolia
```

**Tùy chọn:**
- Mặc định: fund 10% số DICE tokens của deployer
- Set `FUND_AMOUNT` trong `.env` để fund số lượng cụ thể (ví dụ: `FUND_AMOUNT=1000000` = 1M DICE)
- Set `FUND_PERCENTAGE` trong `.env` để fund theo phần trăm (ví dụ: `FUND_PERCENTAGE=0.2` = 20%)

**Ví dụ fund 1 triệu DICE:**
```bash
FUND_AMOUNT=1000000 npx hardhat run scripts/fund-contract.ts --network sepolia
```

### Step 4: Setup All-in-One (Optional)

Chạy tất cả các bước trên trong 1 lệnh:

```bash
npm run setup:all
```

## 📝 Scripts Available

| Script | Command | Mô tả |
|--------|---------|-------|
| Deploy SicBo | `npm run deploy:sicbo` | Deploy PrivateSicBo contract |
| Deploy DICE | `npm run deploy:dice` | Deploy DICE ERC20 token |
| Set Token | `npm run set:token` | Set DICE token address trong PrivateSicBo |
| Fund Contract | `npm run fund:contract` | Fund contract với DICE tokens |
| Setup All | `npm run setup:all` | Chạy deploy:dice → set:token → fund:contract |

## 🔍 Verify Setup

Sau khi setup xong, bạn có thể verify:

1. **Check token address:**
   ```bash
   # Trong frontend hoặc console
   const contract = await ethers.getContractAt("PrivateSicBo", "0x7A49766BA80e18C907E62F0f608cDb05B9D08A6C");
   const tokenAddress = await contract.token();
   console.log("Token address:", tokenAddress);
   ```

2. **Check contract balance:**
   ```bash
   const dice = await ethers.getContractAt("DICE", tokenAddress);
   const balance = await dice.balanceOf("0x7A49766BA80e18C907E62F0f608cDb05B9D08A6C");
   console.log("Contract balance:", ethers.formatEther(balance), "DICE");
   ```

## ⚠️ Troubleshooting

### Error: "Token not set in contract"
- Chạy `npm run set:token` để set token address

### Error: "Deployer is not the contract owner"
- Đảm bảo PRIVATE_KEY trong `.env` là của owner account
- Owner được set khi deploy PrivateSicBo contract

### Error: "Token already set"
- Token chỉ có thể set 1 lần duy nhất
- Nếu cần thay đổi, phải deploy contract mới

### Error: "Insufficient balance"
- Đảm bảo deployer có đủ DICE tokens
- Check balance: `await dice.balanceOf(deployerAddress)`

## 🎮 Next Steps

Sau khi setup xong:

1. ✅ Contract đã có token address
2. ✅ Contract đã được fund với DICE tokens
3. ✅ Frontend có thể connect và chơi game
4. ✅ Players có thể approve và place bets
5. ✅ Winners sẽ nhận DICE tokens từ contract

## 📚 Files Created

- `contracts/contracts/DICE.sol` - ERC20 token contract
- `contracts/scripts/deploy-dice.ts` - Deploy DICE token script
- `contracts/scripts/set-token.ts` - Set token address script
- `contracts/scripts/fund-contract.ts` - Fund contract script
- `frontend/src/deployments/DICE.json` - DICE token deployment info

