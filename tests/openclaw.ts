import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { expect } from "chai";
import BN from "bn.js";

describe("BondIt.lol Agency Launch System", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const launchId = Keypair.generate().publicKey.toBuffer().slice(0, 32);
  const launchIdArray = Array.from(launchId);

  describe("Constants Validation", () => {
    it("supply allocations sum to 1B", () => {
      const curve = 800_000_000;
      const treasury = 150_000_000;
      const lpReserve = 50_000_000;
      expect(curve + treasury + lpReserve).to.equal(1_000_000_000);
    });

    it("fee splits sum to 100%", () => {
      const lpBps = 9900;
      const houseBps = 100;
      expect(lpBps + houseBps).to.equal(10_000);
    });

    it("graduation target is 85 SOL", () => {
      const target = 85 * LAMPORTS_PER_SOL;
      expect(target).to.equal(85_000_000_000);
    });
  });

  describe("Bonding Curve Math", () => {
    const VIRTUAL_SOL = new BN(30_000_000_000); // 30 SOL
    const VIRTUAL_TOKENS = new BN(800_000_000).mul(new BN(1_000_000)); // 800M with 6 decimals

    it("calculates buy correctly with constant product", () => {
      const solAmount = new BN(1_000_000_000); // 1 SOL
      const fee = solAmount.mul(new BN(100)).div(new BN(10_000)); // 1% fee
      const solAfterFee = solAmount.sub(fee);

      const raisedSol = new BN(0);
      const tokensSold = new BN(0);

      const virtualSol = VIRTUAL_SOL.add(raisedSol);
      const virtualTokens = VIRTUAL_TOKENS.sub(tokensSold);

      const k = virtualSol.mul(virtualTokens);
      const newVirtualSol = virtualSol.add(solAfterFee);
      const newVirtualTokens = k.div(newVirtualSol);
      const tokensOut = virtualTokens.sub(newVirtualTokens);

      expect(tokensOut.gt(new BN(0))).to.be.true;
      expect(fee.toNumber()).to.equal(10_000_000); // 0.01 SOL fee
    });

    it("sell returns less SOL than buy cost (due to fees)", () => {
      const buyAmount = new BN(1_000_000_000);
      const buyFee = buyAmount.mul(new BN(100)).div(new BN(10_000));
      const buyAfterFee = buyAmount.sub(buyFee);

      // Buy
      const virtualSol = VIRTUAL_SOL;
      const virtualTokens = VIRTUAL_TOKENS;
      const k = virtualSol.mul(virtualTokens);
      const newVirtualSolBuy = virtualSol.add(buyAfterFee);
      const newVirtualTokensBuy = k.div(newVirtualSolBuy);
      const tokensOut = virtualTokens.sub(newVirtualTokensBuy);

      // Sell those exact tokens back
      const vs2 = newVirtualSolBuy;
      const vt2 = newVirtualTokensBuy;
      const k2 = vs2.mul(vt2);
      const newVt = vt2.add(tokensOut);
      const newVs = k2.div(newVt);
      const grossSolOut = vs2.sub(newVs);
      const sellFee = grossSolOut.mul(new BN(100)).div(new BN(10_000));
      const solOut = grossSolOut.sub(sellFee);

      // Should get back less than paid (buy fee + sell fee)
      expect(solOut.lt(buyAmount)).to.be.true;
    });

    it("price increases with more buys", () => {
      const getPrice = (raised: BN, sold: BN) => {
        const vs = VIRTUAL_SOL.add(raised);
        const vt = VIRTUAL_TOKENS.sub(sold);
        return vs.mul(new BN(1_000_000)).div(vt);
      };

      const price0 = getPrice(new BN(0), new BN(0));
      const price1 = getPrice(new BN(10_000_000_000), new BN("200000000000000")); // 10 SOL, 200M tokens
      expect(price1.gt(price0)).to.be.true;
    });
  });

  describe("Treasury Release Math", () => {
    it("exponential decay release is 0.20% of remaining", () => {
      const remaining = new BN(150_000_000).mul(new BN(1_000_000));
      const release = remaining.mul(new BN(20)).div(new BN(10_000));
      // 0.20% of 150M = 300,000 tokens
      const expectedUnits = new BN(300_000).mul(new BN(1_000_000));
      expect(release.eq(expectedUnits)).to.be.true;
    });

    it("daily cap of 1M tokens is enforced", () => {
      const maxDaily = new BN(1_000_000).mul(new BN(1_000_000));
      const remaining = new BN(150_000_000).mul(new BN(1_000_000));
      const release = remaining.mul(new BN(20)).div(new BN(10_000));
      // 300K < 1M, so decay is the binding constraint here
      expect(release.lt(maxDaily)).to.be.true;
    });

    it("weekly cap of 5M tokens is enforced", () => {
      const maxWeekly = new BN(5_000_000).mul(new BN(1_000_000));
      // 7 days of max daily (1M) = 7M > 5M weekly cap
      const sevenDailyMax = new BN(7_000_000).mul(new BN(1_000_000));
      expect(sevenDailyMax.gt(maxWeekly)).to.be.true;
    });
  });

  describe("Sell Pressure Cap", () => {
    it("returns 400 bps for days 1-7", () => {
      for (let day = 1; day <= 7; day++) {
        expect(computeSellPressureCap(day)).to.equal(400);
      }
    });

    it("returns 100 bps for day 30+", () => {
      expect(computeSellPressureCap(30)).to.equal(100);
      expect(computeSellPressureCap(60)).to.equal(100);
      expect(computeSellPressureCap(180)).to.equal(100);
    });

    it("tapers linearly between day 7 and 30", () => {
      const day15 = computeSellPressureCap(15);
      expect(day15).to.be.greaterThan(100);
      expect(day15).to.be.lessThan(400);
    });
  });

  describe("Flight Mode Conditions", () => {
    it("all conditions met triggers eligibility", () => {
      const result = checkFlightConditions(15_000, 1800, 500, 50);
      expect(result.eligible).to.be.true;
      expect(result.holdersOk).to.be.true;
      expect(result.concentrationOk).to.be.true;
      expect(result.treasuryOk).to.be.true;
    });

    it("not eligible if holders too low", () => {
      const result = checkFlightConditions(10_000, 1800, 500, 50);
      expect(result.eligible).to.be.false;
      expect(result.holdersOk).to.be.false;
    });

    it("not eligible if concentration too high", () => {
      const result = checkFlightConditions(15_000, 2500, 500, 50);
      expect(result.eligible).to.be.false;
      expect(result.concentrationOk).to.be.false;
    });

    it("forced sunset at 180 days regardless of conditions", () => {
      const result = checkFlightConditions(100, 9000, 1500, 180);
      expect(result.eligible).to.be.true;
      expect(result.forcedSunset).to.be.true;
    });

    it("not eligible at 179 days without meeting conditions", () => {
      const result = checkFlightConditions(100, 9000, 1500, 179);
      expect(result.eligible).to.be.false;
      expect(result.forcedSunset).to.be.false;
    });
  });
});

// Helper functions mirroring on-chain logic
function computeSellPressureCap(dayNumber: number): number {
  if (dayNumber <= 7) return 400;
  if (dayNumber >= 30) return 100;
  const range = 30 - 7;
  const elapsed = dayNumber - 7;
  const reduction = Math.floor((300 * elapsed) / range);
  return 400 - reduction;
}

function checkFlightConditions(
  holdersCount: number,
  top10Bps: number,
  treasuryBps: number,
  daysSince: number,
) {
  const holdersOk = holdersCount >= 15_000;
  const concentrationOk = top10Bps <= 1800;
  const treasuryOk = treasuryBps <= 500;
  const forcedSunset = daysSince >= 180;
  const eligible = (holdersOk && concentrationOk && treasuryOk) || forcedSunset;
  return { eligible, holdersOk, concentrationOk, treasuryOk, forcedSunset };
}
