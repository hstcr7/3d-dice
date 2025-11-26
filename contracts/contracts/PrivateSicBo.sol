// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, euint16, euint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import "./IERC20.sol";

/**
 * @title PrivateSicBo
 * @notice Single-round 3-dice game:
 *         - dice values stay encrypted; only the player can decrypt them
 *         - payout is computed encrypted and later publicly decrypted + verified on-chain
 *
 *         Contract pattern mirrors Zama public decryption examples:
 *         1) make ciphertext publicly decryptable
 *         2) off-chain publicDecrypt gives (abiEncodedClearValues, decryptionProof)
 *         3) on-chain verify via FHE.checkSignatures + settle
 */
contract PrivateSicBo is ZamaEthereumConfig {
    using FHE for *; // enables value.allow(), value.allowThis(), etc.

    enum BetType {
        BigSmall,       // a: 0=Small(4-10), 1=Big(11-17); triples lose
        SumExact,       // a: 3..18
        AnyTriple,      // no params
        SpecificTriple, // a: 1..6
        SingleNumber    // a: 1..6; payout depends on occurrences (1/2/3)
    }

    struct Round {
        address player;
        uint256 stakeWei;
        BetType betType;
        uint8 a;
        uint8 b; // reserved for future variants

        euint8 d1;
        euint8 d2;
        euint8 d3;

        euint64 encPayoutWei; // encrypted payout amount in wei (0 if lose)

        bool settleRequested;
        bool settled;
        uint256 clearPayoutWei;
    }

    uint256 private _counter;
    mapping(uint256 => Round) public rounds;
    mapping(address => uint256[]) public roundsByPlayer;

    IERC20 public token; // ERC20 token address (DICE token)
    address public owner; // Contract owner

    error InvalidBet();
    error NotYourRound();
    error AlreadyRequested();
    error AlreadySettled();
    error NotRequested();
    error TokenNotSet();
    error InsufficientAllowance();
    error TransferFailed();

    event RoundPlayed(
        uint256 indexed roundId,
        address indexed player,
        uint256 stakeWei,
        BetType betType,
        uint8 a,
        uint8 b,
        euint8 d1,
        euint8 d2,
        euint8 d3,
        euint64 encPayoutWei
    );

    event SettleRequested(uint256 indexed roundId, euint64 encPayoutWei);
    event Settled(uint256 indexed roundId, address indexed player, uint256 payoutWei);
    event TokenSet(address indexed token);
    event Funded(address indexed funder, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    /// @notice Set the ERC20 token address (can only be called by owner, once)
    function setToken(address _token) external {
        require(msg.sender == owner, "Only owner");
        require(address(token) == address(0), "Token already set");
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        emit TokenSet(_token);
    }

    /// @notice Fund contract bankroll with tokens (needed to pay winners).
    function fund(uint256 amount) external {
        if (address(token) == address(0)) revert TokenNotSet();
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Funded(msg.sender, amount);
    }

    /**
     * @notice Place a bet for one single round. Dice + payout are produced encrypted.
     * @dev stakeAmount is the token amount. Player must approve contract to spend tokens first.
     */
    function bet(BetType betType, uint8 a, uint8 b, uint256 stakeAmount) external returns (uint256 roundId) {
        if (address(token) == address(0)) revert TokenNotSet();
        if (stakeAmount == 0) revert InvalidBet();

        // Check allowance and transfer tokens from player to contract
        uint256 allowance = token.allowance(msg.sender, address(this));
        if (allowance < stakeAmount) revert InsufficientAllowance();
        
        require(token.transferFrom(msg.sender, address(this), stakeAmount), "Transfer failed");

        // Validate public params
        _validateBet(betType, a, b);

        // Roll 3 dice encrypted (values in [1..6])
        // Each die gets unique entropy to avoid correlation
        euint8 d1 = _rollDie(1);
        euint8 d2 = _rollDie(2);
        euint8 d3 = _rollDie(3);

        // Compute encrypted payout quantity in tokens (euint64)
        euint64 encPayoutWei = _computeEncryptedPayoutWei(betType, a, b, d1, d2, d3, stakeAmount);

        // Persist
        _counter++;
        roundId = _counter;

        rounds[roundId] = Round({
            player: msg.sender,
            stakeWei: stakeAmount,
            betType: betType,
            a: a,
            b: b,
            d1: d1,
            d2: d2,
            d3: d3,
            encPayoutWei: encPayoutWei,
            settleRequested: false,
            settled: false,
            clearPayoutWei: 0
        });

        roundsByPlayer[msg.sender].push(roundId);

        // Permissions:
        // - player can decrypt dice (for UI)
        // - contract can access all ciphertexts for later settlement steps
        FHE.allowThis(d1);
        FHE.allowThis(d2);
        FHE.allowThis(d3);
        FHE.allowThis(encPayoutWei);

        FHE.allow(d1, msg.sender);
        FHE.allow(d2, msg.sender);
        FHE.allow(d3, msg.sender);
        // optional: allow player to decrypt payout handle too
        FHE.allow(encPayoutWei, msg.sender);

        emit RoundPlayed(roundId, msg.sender, stakeAmount, betType, a, b, d1, d2, d3, encPayoutWei);
    }

    /**
     * @notice Mark the round payout ciphertext as publicly decryptable (anyone can request its decryption).
     */
    function requestSettle(uint256 roundId) external {
        Round storage r = rounds[roundId];
        if (r.player == address(0)) revert InvalidBet();
        if (r.player != msg.sender) revert NotYourRound();
        if (r.settleRequested) revert AlreadyRequested();
        if (r.settled) revert AlreadySettled();

        r.settleRequested = true;

        // Allow permissionless public decryption of the payout ciphertext.
        FHE.makePubliclyDecryptable(r.encPayoutWei);

        emit SettleRequested(roundId, r.encPayoutWei);
    }

    /**
     * @notice Finalize settlement after off-chain public decryption.
     * @param abiEncodedClearPayout ABI encoding of uint64 payout value (in wei) corresponding to the encrypted handle.
     * @param decryptionProof Proof returned by relayer-sdk publicDecrypt.
     */
    function finalizeSettle(uint256 roundId, bytes calldata abiEncodedClearPayout, bytes calldata decryptionProof) external {
        Round storage r = rounds[roundId];
        if (!r.settleRequested) revert NotRequested();
        if (r.settled) revert AlreadySettled();

        // 1) Verify proof against ciphertext handle
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(r.encPayoutWei);
        FHE.checkSignatures(cts, abiEncodedClearPayout, decryptionProof);

        // 2) Decode clear payout and pay
        uint64 payoutWei64 = abi.decode(abiEncodedClearPayout, (uint64));
        uint256 payoutWei = uint256(payoutWei64);

        r.settled = true;
        r.clearPayoutWei = payoutWei;

        if (payoutWei > 0) {
            if (address(token) == address(0)) revert TokenNotSet();
            uint256 contractBalance = token.balanceOf(address(this));
            require(contractBalance >= payoutWei, "Bankroll insufficient");
            require(token.transfer(r.player, payoutWei), "Token transfer failed");
        }

        emit Settled(roundId, r.player, payoutWei);
    }

    // ---- Views ----

    function roundsCount() external view returns (uint256) {
        return _counter;
    }

    function getPlayerRounds(address player) external view returns (uint256[] memory) {
        return roundsByPlayer[player];
    }

    function getDiceHandles(uint256 roundId) external view returns (euint8, euint8, euint8) {
        Round storage r = rounds[roundId];
        return (r.d1, r.d2, r.d3);
    }

    function getEncryptedPayoutHandle(uint256 roundId) external view returns (euint64) {
        return rounds[roundId].encPayoutWei;
    }

    // ---- Internal: validation ----

    function _validateBet(BetType betType, uint8 a, uint8 /*b*/) internal pure {
        if (betType == BetType.BigSmall) {
            if (a > 1) revert InvalidBet();
            return;
        }
        if (betType == BetType.SumExact) {
            if (a < 3 || a > 18) revert InvalidBet();
            return;
        }
        if (betType == BetType.AnyTriple) {
            if (a != 0) revert InvalidBet();
            return;
        }
        if (betType == BetType.SpecificTriple) {
            if (a < 1 || a > 6) revert InvalidBet();
            return;
        }
        if (betType == BetType.SingleNumber) {
            if (a < 1 || a > 6) revert InvalidBet();
            return;
        }
        revert InvalidBet();
    }

    // ---- Internal: dice + payout logic (FHE) ----

    /**
     * @dev Generate encrypted dice in [1..6].
     *      Note: Uses block-based pseudo-randomness for simplicity.
     *      For production, consider using VRF or commit-reveal scheme.
     * @param dieIndex Index of the die (1, 2, or 3) to add unique entropy
     */
    function _rollDie(uint8 dieIndex) internal returns (euint8) {
        // Use block-based pseudo-randomness with unique entropy per die
        // This is deterministic but unpredictable before the block is mined
        // Using hash chain to create independent seeds for each die
        
        // Base seed with multiple entropy sources
        uint256 baseSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, 
            _counter, 
            msg.sender,
            block.number,
            blockhash(block.number - 1),
            block.gaslimit,
            gasleft()  // Runtime entropy
        )));
        
        // Create independent seed for each die using hash chain
        // Each die gets a different hash iteration to ensure independence
        uint256 seed = baseSeed;
        for (uint8 i = 0; i < dieIndex; i++) {
            seed = uint256(keccak256(abi.encodePacked(seed, dieIndex, i)));
        }
        
        // Additional mixing with dieIndex
        seed = uint256(keccak256(abi.encodePacked(seed, dieIndex * 0x1234567890ABCDEF)));
        
        // Generate value in [1..6] using better distribution
        // Use higher bits for better randomness
        uint8 randomValue = uint8((seed >> (dieIndex * 8)) % 6) + 1;
        
        // Convert to encrypted euint8
        return FHE.asEuint8(randomValue);
    }

    function _isTriple(euint8 d1, euint8 d2, euint8 d3) internal returns (ebool) {
        ebool eq12 = FHE.eq(d1, d2);
        ebool eq23 = FHE.eq(d2, d3);
        return FHE.and(eq12, eq23);
    }

    function _sum3(euint8 d1, euint8 d2, euint8 d3) internal returns (euint8) {
        // 1..6 + 1..6 + 1..6 => 3..18 fits in euint8
        return FHE.add(FHE.add(d1, d2), d3);
    }

    function _countFace(euint8 d, uint8 face) internal returns (euint8) {
        ebool isFace = FHE.eq(d, FHE.asEuint8(face));
        return FHE.select(isFace, FHE.asEuint8(1), FHE.asEuint8(0));
    }

    /**
     * @dev Core: compute encrypted payout amount in wei.
     *      payout = 0 if lose; else payout = stakeWei * multiplier (multiplier includes stake return).
     *
     *      For settle, we only need to publicly decrypt this ONE ciphertext.
     *      
     *      Note: Due to euint64 limitation, stake must be <= type(uint64).max.
     *      For tokens with 18 decimals, max stake is ~18.4 tokens.
     *      For larger stakes, consider using a different approach or scaling.
     */
    function _computeEncryptedPayoutWei(
        BetType betType,
        uint8 a,
        uint8 /*b*/,
        euint8 d1,
        euint8 d2,
        euint8 d3,
        uint256 stakeWei
    ) internal returns (euint64) {
        // Limit stake to fit in euint64 (uint64.max = 18,446,744,073,709,551,615)
        // For 18-decimal tokens: max ~18.4 tokens
        // We'll use a safe limit of 18 tokens to maximize betting range
        uint256 maxStake = 18 * 10**18; // 18 tokens with 18 decimals
        require(stakeWei > 0, "Stake must be greater than 0");
        require(stakeWei <= maxStake, "Stake too large (max 18 tokens)");
        require(stakeWei <= type(uint64).max, "Stake exceeds uint64 limit");

        euint64 stake = FHE.asEuint64(uint64(stakeWei));
        euint64 zero = FHE.asEuint64(0);

        euint8 sum = _sum3(d1, d2, d3);
        ebool triple = _isTriple(d1, d2, d3);

        if (betType == BetType.BigSmall) {
            ebool isBigRange = FHE.and(FHE.ge(sum, FHE.asEuint8(11)), FHE.le(sum, FHE.asEuint8(17)));
            ebool isSmallRange = FHE.and(FHE.ge(sum, FHE.asEuint8(4)), FHE.le(sum, FHE.asEuint8(10)));
            ebool notTriple = FHE.not(triple);

            ebool big = FHE.and(isBigRange, notTriple);
            ebool small = FHE.and(isSmallRange, notTriple);

            ebool wantBig = (a == 1) ? FHE.asEbool(true) : FHE.asEbool(false);
            ebool win = FHE.select(wantBig, big, small);

            euint64 payoutIfWin = FHE.mul(stake, FHE.asEuint64(2));
            return FHE.select(win, payoutIfWin, zero);
        }

        if (betType == BetType.SumExact) {
            ebool win = FHE.eq(sum, FHE.asEuint8(a));

            uint64 multiplier = _sumExactMultiplier(a); // includes stake return
            euint64 payoutIfWin = FHE.mul(stake, FHE.asEuint64(multiplier));
            return FHE.select(win, payoutIfWin, zero);
        }

        if (betType == BetType.AnyTriple) {
            ebool win = triple;
            euint64 payoutIfWin = FHE.mul(stake, FHE.asEuint64(32));
            return FHE.select(win, payoutIfWin, zero);
        }

        if (betType == BetType.SpecificTriple) {
            ebool isSpecific = FHE.and(triple, FHE.eq(d1, FHE.asEuint8(a)));
            euint64 payoutIfWin = FHE.mul(stake, FHE.asEuint64(181));
            return FHE.select(isSpecific, payoutIfWin, zero);
        }

        if (betType == BetType.SingleNumber) {
            euint8 c1 = _countFace(d1, a);
            euint8 c2 = _countFace(d2, a);
            euint8 c3 = _countFace(d3, a);
            euint8 count = FHE.add(FHE.add(c1, c2), c3);

            ebool is1 = FHE.eq(count, FHE.asEuint8(1));
            ebool is2 = FHE.eq(count, FHE.asEuint8(2));
            ebool is3 = FHE.eq(count, FHE.asEuint8(3));

            euint64 p1 = FHE.mul(stake, FHE.asEuint64(2));
            euint64 p2 = FHE.mul(stake, FHE.asEuint64(3));
            euint64 p3 = FHE.mul(stake, FHE.asEuint64(4));

            return FHE.select(is1, p1, FHE.select(is2, p2, FHE.select(is3, p3, zero)));
        }

        return zero;
    }

    /// @dev Multipliers include stake return (e.g., 50:1 profit => 51x payout).
    function _sumExactMultiplier(uint8 sum) internal pure returns (uint64) {
        if (sum == 4 || sum == 17) return 51;
        if (sum == 5 || sum == 16) return 19;
        if (sum == 6 || sum == 15) return 15;
        if (sum == 7 || sum == 14) return 13;
        if (sum == 8 || sum == 13) return 9;
        if (sum == 9 || sum == 12) return 7;
        if (sum == 10 || sum == 11) return 7;
        return 0;
    }
}
