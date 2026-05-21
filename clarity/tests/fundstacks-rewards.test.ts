import { describe, expect, it } from "vitest";
import { Cl, cvToString } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

// -- Setup --

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const donor1 = accounts.get("wallet_1")!;
const donor2 = accounts.get("wallet_2")!;
const stranger = accounts.get("wallet_3")!;

// The simnet-deployed fundraising contract satisfies fundstacks-source-trait.
const fundraisingSource = Cl.contractPrincipal(deployer, "fundraising");

// Error codes from fundstacks-rewards.clar
const ERR_NOT_AUTHORIZED = 300n;
const ERR_NO_CONTRIBUTION = 301n;
const ERR_ALREADY_CLAIMED = 302n;
const ERR_INVALID_CAMPAIGN = 303n;
const ERR_INVALID_RATE = 304n;

// Issuance curve constants (must mirror the contract).
const RATE_SCALE = 1000n;
const RATE_MIN = 1000n;
const RATE_SPREAD = 9000n;

function parseOkUint(result: unknown): bigint {
  const s = cvToString(result as any);
  const m = s.match(/^\(ok u(\d+)\)$/);
  if (!m) throw new Error(`Expected (ok uN), got: ${s}`);
  return BigInt(m[1]);
}

function createCampaign(goalUstx: number) {
  const r = simnet.callPublicFn(
    "fundraising",
    "create-campaign",
    [Cl.uint(goalUstx), Cl.uint(0), Cl.principal(deployer)],
    deployer
  );
  return Number(parseOkUint(r.result));
}

function donateStx(campaignId: number, donor: string, amount: bigint) {
  const r = simnet.callPublicFn(
    "fundraising",
    "donate-stx",
    [Cl.uint(campaignId), Cl.uint(amount)],
    donor
  );
  expect(r.result).toBeOk(Cl.bool(true));
}

function earnRewards(campaignId: number, donor: string) {
  return simnet.callPublicFn(
    "fundstacks-rewards",
    "earn-rewards",
    [fundraisingSource, Cl.uint(campaignId)],
    donor
  );
}

function balance(who: string): bigint {
  const r = simnet.callReadOnlyFn(
    "fundstacks-rewards",
    "get-balance",
    [Cl.principal(who)],
    deployer
  );
  return parseOkUint(r.result);
}

// Expected tokens: mirrors compute-tokens in the contract.
function expectedTokens(
  contributionUstx: bigint,
  goal: bigint,
  totalStx: bigint
): bigint {
  if (goal === 0n) return 0n;
  const progress = totalStx >= goal ? 100n : (totalStx * 100n) / goal;
  const rate = RATE_MIN + (RATE_SPREAD * (100n - progress)) / 100n;
  return (contributionUstx * rate) / RATE_SCALE;
}

// -- Tests --

describe("fundstacks-rewards: SIP-010 metadata", () => {
  it("returns correct name", () => {
    const r = simnet.callReadOnlyFn("fundstacks-rewards", "get-name", [], deployer);
    expect(r.result).toBeOk(Cl.stringAscii("FundStacks Rewards"));
  });

  it("returns correct symbol", () => {
    const r = simnet.callReadOnlyFn("fundstacks-rewards", "get-symbol", [], deployer);
    expect(r.result).toBeOk(Cl.stringAscii("FSTR"));
  });

  it("returns 6 decimals", () => {
    const r = simnet.callReadOnlyFn("fundstacks-rewards", "get-decimals", [], deployer);
    expect(r.result).toBeOk(Cl.uint(6));
  });

  it("initial total supply is zero", () => {
    const r = simnet.callReadOnlyFn("fundstacks-rewards", "get-total-supply", [], deployer);
    expect(r.result).toBeOk(Cl.uint(0));
  });

  it("initial balance for any account is zero", () => {
    expect(balance(donor1)).toBe(0n);
  });
});

describe("fundstacks-rewards: earn-rewards issuance curve", () => {
  it("mints correct tokens at 0% campaign progress (first donor, solo)", () => {
    // Campaign is 10 STX goal; donor donates 1 STX.
    // totalStx after donation = 1 STX = 10% of goal.
    // progress = 10%, rate = 1000 + 9000 * 90 / 100 = 9100
    // tokens = 1_000_000 * 9100 / 1000 = 9_100_000 micro-FSTR = 9.1 FSTR
    const goal = 10_000_000n;
    const donation = 1_000_000n;
    const campaignId = createCampaign(Number(goal));
    donateStx(campaignId, donor1, donation);

    const r = earnRewards(campaignId, donor1);
    const tokens = parseOkUint(r.result);
    const expected = expectedTokens(donation, goal, donation);
    expect(tokens).toBe(expected);
    expect(balance(donor1)).toBe(expected);
  });

  it("mints more tokens to an early donor than a late donor on the same campaign", () => {
    // Goal = 10 STX. donor1 donates first (10%), donor2 donates at 50%.
    const goal = 10_000_000n;
    const donation = 1_000_000n;
    const campaignId = createCampaign(Number(goal));

    // donor1 donates at 0% progress (they ARE the first 10%)
    donateStx(campaignId, donor1, donation);
    const r1 = earnRewards(campaignId, donor1);
    const tokens1 = parseOkUint(r1.result);

    // donor2 donates at 10% progress (campaign is now 20%)
    donateStx(campaignId, donor2, donation);
    const r2 = earnRewards(campaignId, donor2);
    const tokens2 = parseOkUint(r2.result);

    // Both donated the same amount but donor1 claimed when progress was lower.
    expect(tokens1).toBeGreaterThan(tokens2);
  });

  it("mints at min rate (1 FSTR/STX) when campaign is exactly 100% funded", () => {
    // Goal = 1 STX, donor donates exactly the goal.
    const goal = 1_000_000n;
    const campaignId = createCampaign(Number(goal));
    donateStx(campaignId, donor1, goal);

    const r = earnRewards(campaignId, donor1);
    const tokens = parseOkUint(r.result);
    // progress = 100%, rate = 1000, tokens = 1_000_000 * 1000 / 1000 = 1_000_000 micro-FSTR = 1 FSTR
    expect(tokens).toBe(1_000_000n);
  });

  it("total-supply increases by the minted amount", () => {
    const goal = 5_000_000n;
    const donation = 1_000_000n;
    const campaignId = createCampaign(Number(goal));
    donateStx(campaignId, donor1, donation);

    const before = parseOkUint(
      simnet.callReadOnlyFn("fundstacks-rewards", "get-total-supply", [], deployer).result
    );
    const r = earnRewards(campaignId, donor1);
    const minted = parseOkUint(r.result);
    const after = parseOkUint(
      simnet.callReadOnlyFn("fundstacks-rewards", "get-total-supply", [], deployer).result
    );

    expect(after - before).toBe(minted);
  });

  it("has-claimed returns true after earn-rewards", () => {
    const campaignId = createCampaign(10_000_000);
    donateStx(campaignId, donor1, 1_000_000n);
    earnRewards(campaignId, donor1);

    const r = simnet.callReadOnlyFn(
      "fundstacks-rewards",
      "has-claimed",
      [Cl.uint(campaignId), Cl.principal(donor1)],
      deployer
    );
    expect(r.result).toBeBool(true);
  });

  it("same donor can earn rewards on two different campaigns independently", () => {
    const campA = createCampaign(10_000_000);
    const campB = createCampaign(10_000_000);

    donateStx(campA, donor1, 1_000_000n);
    donateStx(campB, donor1, 1_000_000n);

    const rA = earnRewards(campA, donor1);
    const rB = earnRewards(campB, donor1);

    expect(parseOkUint(rA.result)).toBeGreaterThan(0n);
    expect(parseOkUint(rB.result)).toBeGreaterThan(0n);
  });
});

describe("fundstacks-rewards: transfer (SIP-010)", () => {
  it("lets the token holder transfer to another account", () => {
    const campaignId = createCampaign(10_000_000);
    donateStx(campaignId, donor1, 1_000_000n);
    const r = earnRewards(campaignId, donor1);
    const minted = parseOkUint(r.result);

    const sendAmt = minted / 2n;
    const tx = simnet.callPublicFn(
      "fundstacks-rewards",
      "transfer",
      [Cl.uint(sendAmt), Cl.principal(donor1), Cl.principal(donor2), Cl.none()],
      donor1
    );
    expect(tx.result).toBeOk(Cl.bool(true));
    expect(balance(donor2)).toBe(sendAmt);
  });

  it("rejects transfer when tx-sender is not the sender argument", () => {
    const campaignId = createCampaign(10_000_000);
    donateStx(campaignId, donor1, 1_000_000n);
    earnRewards(campaignId, donor1);

    const r = simnet.callPublicFn(
      "fundstacks-rewards",
      "transfer",
      [Cl.uint(1n), Cl.principal(donor1), Cl.principal(stranger), Cl.none()],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });
});

describe("fundstacks-rewards: preview-rewards", () => {
  it("returns the same value that earn-rewards would mint", () => {
    const goal = 10_000_000n;
    const donation = 2_000_000n;
    const campaignId = createCampaign(Number(goal));
    donateStx(campaignId, donor1, donation);

    // Read current campaign state to pass to preview
    const preview = simnet.callReadOnlyFn(
      "fundstacks-rewards",
      "preview-rewards",
      [Cl.uint(donation), Cl.uint(goal), Cl.uint(donation)],
      donor1
    );
    const previewTokens = parseOkUint(preview.result);

    const actual = parseOkUint(earnRewards(campaignId, donor1).result);
    expect(previewTokens).toBe(actual);
  });
});

// -- Edge cases --

describe("fundstacks-rewards: earn-rewards guards", () => {
  it("rejects a donor with no contribution", () => {
    const campaignId = createCampaign(10_000_000);
    const r = earnRewards(campaignId, donor1);
    expect(r.result).toBeErr(Cl.uint(ERR_NO_CONTRIBUTION));
  });

  it("rejects a second earn-rewards call for the same (campaign, donor)", () => {
    const campaignId = createCampaign(10_000_000);
    donateStx(campaignId, donor1, 1_000_000n);
    earnRewards(campaignId, donor1);

    const r = earnRewards(campaignId, donor1);
    expect(r.result).toBeErr(Cl.uint(ERR_ALREADY_CLAIMED));
  });

  it("does not mint additional tokens after an extra donation when already claimed", () => {
    const campaignId = createCampaign(10_000_000);
    donateStx(campaignId, donor1, 1_000_000n);
    earnRewards(campaignId, donor1);
    const balanceAfterFirst = balance(donor1);

    donateStx(campaignId, donor1, 1_000_000n);
    const r = earnRewards(campaignId, donor1);
    expect(r.result).toBeErr(Cl.uint(ERR_ALREADY_CLAIMED));
    expect(balance(donor1)).toBe(balanceAfterFirst);
  });
});

describe("fundstacks-rewards: issuance curve edge cases", () => {
  it("overfunded campaign pays out at min rate (progress capped at 100%)", () => {
    const goal = 1_000_000n;
    const donation = 2_000_000n;
    const campaignId = createCampaign(Number(goal));
    donateStx(campaignId, donor1, donation);

    const r = earnRewards(campaignId, donor1);
    const tokens = parseOkUint(r.result);
    // progress capped at 100%: tokens = donation * 1000 / 1000 = donation
    expect(tokens).toBe(donation);
  });

  it("two donors with equal donations at same snapshot receive equal rewards", () => {
    const goal = 20_000_000n;
    const donation = 1_000_000n;
    const campaignId = createCampaign(Number(goal));
    donateStx(campaignId, donor1, donation);
    donateStx(campaignId, donor2, donation);

    const r1 = earnRewards(campaignId, donor1);
    const r2 = earnRewards(campaignId, donor2);
    expect(parseOkUint(r1.result)).toBe(parseOkUint(r2.result));
  });

  it("large donation does not overflow (near-max STX supply)", () => {
    // 21M STX = 21_000_000_000_000 microSTX -- well within Clarity uint128.
    const donation = 21_000_000_000_000n;
    const goal = 21_000_000_000_000n;
    const campaignId = createCampaign(Number(goal));
    donateStx(campaignId, donor1, donation);

    const r = earnRewards(campaignId, donor1);
    // progress = 100%, rate = 1000, tokens = donation
    expect(parseOkUint(r.result)).toBe(donation);
  });
});

describe("fundstacks-rewards: admin", () => {
  it("owner can update token URI", () => {
    const newUri = "https://fundstacks.vercel.app/api/rewards/v2/token.json";
    const r = simnet.callPublicFn(
      "fundstacks-rewards",
      "set-token-uri",
      [Cl.stringUtf8(newUri)],
      deployer
    );
    expect(r.result).toBeOk(Cl.bool(true));

    const getR = simnet.callReadOnlyFn("fundstacks-rewards", "get-token-uri", [], deployer);
    expect(getR.result).toBeOk(Cl.some(Cl.stringUtf8(newUri)));
  });

  it("non-owner cannot update token URI", () => {
    const r = simnet.callPublicFn(
      "fundstacks-rewards",
      "set-token-uri",
      [Cl.stringUtf8("https://evil.example.com/token.json")],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });

  it("owner can update sBTC rate", () => {
    const r = simnet.callPublicFn(
      "fundstacks-rewards",
      "set-sbtc-rate",
      [Cl.uint(200), Cl.uint(1)],
      deployer
    );
    expect(r.result).toBeOk(Cl.bool(true));
  });

  it("rejects zero denominator in set-sbtc-rate", () => {
    const r = simnet.callPublicFn(
      "fundstacks-rewards",
      "set-sbtc-rate",
      [Cl.uint(100), Cl.uint(0)],
      deployer
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_RATE));
  });

  it("non-owner cannot update sBTC rate", () => {
    const r = simnet.callPublicFn(
      "fundstacks-rewards",
      "set-sbtc-rate",
      [Cl.uint(1), Cl.uint(1)],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });
});
