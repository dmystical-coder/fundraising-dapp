import { describe, expect, it, beforeEach } from "vitest";
import { Cl, cvToString } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

// -- Setup --

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const donor1 = accounts.get("wallet_1")!;
const donor2 = accounts.get("wallet_2")!;
const stranger = accounts.get("wallet_3")!;

// Tier constants from donor-badges.clar
const TIER_NONE = 0n;
const TIER_BRONZE = 1n;
const TIER_SILVER = 2n;
const TIER_GOLD = 3n;

// Threshold constants from donor-badges.clar
const BRONZE_THRESHOLD = 1_000_000n; // 1 STX
const SILVER_THRESHOLD = 10_000_000n; // 10 STX
const GOLD_THRESHOLD = 100_000_000n; // 100 STX

// Error codes from donor-badges.clar
const ERR_NOT_AUTHORIZED = 200n;
const ERR_NO_DONATION = 201n;
const ERR_ALREADY_AT_TIER = 202n;
const ERR_SOULBOUND = 204n;
const ERR_INVALID_RATE = 205n;

// The trait arg for claim-badge / preview-tier: the simnet-deployed
// fundraising contract is at deployer.fundraising.
const fundraisingSource = Cl.contractPrincipal(deployer, "fundraising");

function parseOkUint(result: unknown): bigint {
  const s = cvToString(result as any);
  const m = s.match(/^\(ok u(\d+)\)$/);
  if (!m) throw new Error(`Expected (ok uN), got: ${s}`);
  return BigInt(m[1]);
}

function createCampaign(goalUstx: number, endAt = 0n) {
  const response = simnet.callPublicFn(
    "fundraising",
    "create-campaign",
    [Cl.uint(goalUstx), Cl.uint(endAt), Cl.principal(deployer)],
    deployer
  );
  return Number(parseOkUint(response.result));
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

// -- Tests --

describe("donor-badges: tier-for-amount (pure)", () => {
  it("returns tier-none below Bronze threshold", () => {
    const r = simnet.callReadOnlyFn(
      "donor-badges",
      "tier-for-amount",
      [Cl.uint(BRONZE_THRESHOLD - 1n)],
      deployer
    );
    expect(r.result).toBeUint(TIER_NONE);
  });

  it("returns tier-bronze at exactly the Bronze threshold", () => {
    const r = simnet.callReadOnlyFn(
      "donor-badges",
      "tier-for-amount",
      [Cl.uint(BRONZE_THRESHOLD)],
      deployer
    );
    expect(r.result).toBeUint(TIER_BRONZE);
  });

  it("returns tier-silver at exactly the Silver threshold", () => {
    const r = simnet.callReadOnlyFn(
      "donor-badges",
      "tier-for-amount",
      [Cl.uint(SILVER_THRESHOLD)],
      deployer
    );
    expect(r.result).toBeUint(TIER_SILVER);
  });

  it("returns tier-gold at exactly the Gold threshold", () => {
    const r = simnet.callReadOnlyFn(
      "donor-badges",
      "tier-for-amount",
      [Cl.uint(GOLD_THRESHOLD)],
      deployer
    );
    expect(r.result).toBeUint(TIER_GOLD);
  });

  it("returns tier-gold for arbitrary amounts above the Gold threshold", () => {
    const r = simnet.callReadOnlyFn(
      "donor-badges",
      "tier-for-amount",
      [Cl.uint(GOLD_THRESHOLD * 1_000_000n)],
      deployer
    );
    expect(r.result).toBeUint(TIER_GOLD);
  });
});

describe("donor-badges: claim-badge", () => {
  it("rejects a donor who has not contributed to the campaign", () => {
    const campaignId = createCampaign(100_000_000);
    const r = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NO_DONATION));
  });

  it("rejects donors whose contribution is below the Bronze threshold", () => {
    const campaignId = createCampaign(100_000_000);
    donateStx(campaignId, donor1, BRONZE_THRESHOLD - 1n);
    const r = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NO_DONATION));
  });

  it("mints a Bronze badge for a donor who has crossed the Bronze threshold", () => {
    const campaignId = createCampaign(100_000_000);
    donateStx(campaignId, donor1, BRONZE_THRESHOLD);

    const r = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );
    const tokenId = parseOkUint(r.result);
    expect(tokenId).toBe(1n);

    // donor now owns the token
    const ownerR = simnet.callReadOnlyFn(
      "donor-badges",
      "get-owner",
      [Cl.uint(tokenId)],
      donor1
    );
    expect(ownerR.result).toBeOk(Cl.some(Cl.principal(donor1)));

    // last-token-id incremented
    const lastR = simnet.callReadOnlyFn(
      "donor-badges",
      "get-last-token-id",
      [],
      donor1
    );
    expect(lastR.result).toBeOk(Cl.uint(1));

    // donor-badge-id map keyed by (campaign, donor) returns this token
    const idR = simnet.callReadOnlyFn(
      "donor-badges",
      "get-donor-badge-id",
      [Cl.uint(campaignId), Cl.principal(donor1)],
      donor1
    );
    expect(idR.result).toBeSome(Cl.uint(tokenId));
  });

  it("upgrades an existing badge in place when the donor crosses a tier", () => {
    const campaignId = createCampaign(1_000_000_000);
    donateStx(campaignId, donor1, BRONZE_THRESHOLD);

    // First claim → Bronze, tokenId 1
    const firstR = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );
    const firstTokenId = parseOkUint(firstR.result);

    // Donor donates enough to cross Silver
    donateStx(campaignId, donor1, SILVER_THRESHOLD - BRONZE_THRESHOLD);

    // Second claim → same tokenId, upgraded
    const secondR = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );
    const secondTokenId = parseOkUint(secondR.result);
    expect(secondTokenId).toBe(firstTokenId);

    // last-token-id still 1: no new mint
    const lastR = simnet.callReadOnlyFn(
      "donor-badges",
      "get-last-token-id",
      [],
      donor1
    );
    expect(lastR.result).toBeOk(Cl.uint(1));
  });

  it("rejects re-claim when the donor is already at the qualifying tier", () => {
    const campaignId = createCampaign(100_000_000);
    donateStx(campaignId, donor1, BRONZE_THRESHOLD);

    const firstR = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );
    expect(firstR.result).toBeOk(Cl.uint(1));

    // No further donation; calling again is a no-op-from-the-chain's-perspective
    const secondR = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );
    expect(secondR.result).toBeErr(Cl.uint(ERR_ALREADY_AT_TIER));
  });

  it("mints separate badges for the same donor across different campaigns", () => {
    const campA = createCampaign(100_000_000);
    const campB = createCampaign(100_000_000);

    donateStx(campA, donor1, BRONZE_THRESHOLD);
    donateStx(campB, donor1, BRONZE_THRESHOLD);

    const rA = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campA)],
      donor1
    );
    const rB = simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campB)],
      donor1
    );

    expect(parseOkUint(rA.result)).toBe(1n);
    expect(parseOkUint(rB.result)).toBe(2n);
  });
});

describe("donor-badges: transfer (soulbound)", () => {
  it("rejects every transfer attempt with err-soulbound", () => {
    const campaignId = createCampaign(100_000_000);
    donateStx(campaignId, donor1, BRONZE_THRESHOLD);
    simnet.callPublicFn(
      "donor-badges",
      "claim-badge",
      [fundraisingSource, Cl.uint(campaignId)],
      donor1
    );

    // owner trying to transfer to themselves
    const ownerR = simnet.callPublicFn(
      "donor-badges",
      "transfer",
      [Cl.uint(1), Cl.principal(donor1), Cl.principal(donor1)],
      donor1
    );
    expect(ownerR.result).toBeErr(Cl.uint(ERR_SOULBOUND));

    // owner trying to transfer to another donor
    const otherR = simnet.callPublicFn(
      "donor-badges",
      "transfer",
      [Cl.uint(1), Cl.principal(donor1), Cl.principal(donor2)],
      donor1
    );
    expect(otherR.result).toBeErr(Cl.uint(ERR_SOULBOUND));

    // a stranger trying to transfer (would normally fail on ownership, but soulbound short-circuits)
    const strangerR = simnet.callPublicFn(
      "donor-badges",
      "transfer",
      [Cl.uint(1), Cl.principal(donor1), Cl.principal(stranger)],
      stranger
    );
    expect(strangerR.result).toBeErr(Cl.uint(ERR_SOULBOUND));
  });
});

describe("donor-badges: admin (set-token-uri, set-sbtc-rate)", () => {
  it("lets the contract owner update the token URI", () => {
    const newUri = "https://fundstacks.vercel.app/api/badges/v2/{id}.json";
    const r = simnet.callPublicFn(
      "donor-badges",
      "set-token-uri",
      [Cl.stringAscii(newUri)],
      deployer
    );
    expect(r.result).toBeOk(Cl.bool(true));

    const getR = simnet.callReadOnlyFn(
      "donor-badges",
      "get-token-uri",
      [Cl.uint(1)],
      deployer
    );
    expect(getR.result).toBeOk(Cl.some(Cl.stringAscii(newUri)));
  });

  it("rejects set-token-uri from a non-owner", () => {
    const r = simnet.callPublicFn(
      "donor-badges",
      "set-token-uri",
      [Cl.stringAscii("https://evil.example.com/{id}.json")],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });

  it("lets the contract owner update the sBTC-to-STX rate", () => {
    const r = simnet.callPublicFn(
      "donor-badges",
      "set-sbtc-rate",
      [Cl.uint(200), Cl.uint(1)],
      deployer
    );
    expect(r.result).toBeOk(Cl.bool(true));
  });

  it("rejects a denominator of zero on set-sbtc-rate", () => {
    const r = simnet.callPublicFn(
      "donor-badges",
      "set-sbtc-rate",
      [Cl.uint(100), Cl.uint(0)],
      deployer
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_RATE));
  });

  it("rejects set-sbtc-rate from a non-owner", () => {
    const r = simnet.callPublicFn(
      "donor-badges",
      "set-sbtc-rate",
      [Cl.uint(1), Cl.uint(1)],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });
});
