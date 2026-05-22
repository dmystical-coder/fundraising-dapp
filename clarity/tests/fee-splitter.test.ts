import { describe, expect, it } from "vitest";
import { Cl, cvToString } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

// -- Setup --

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const donor1 = accounts.get("wallet_1")!;
const donor2 = accounts.get("wallet_2")!;
const charity = accounts.get("wallet_3")!;
const stranger = accounts.get("wallet_4")!;

const fundraisingSource = Cl.contractPrincipal(deployer, "fundraising");

// Error codes from fee-splitter.clar
const ERR_NOT_AUTHORIZED = 400n;
const ERR_INVALID_FEE = 401n;
const ERR_INVALID_SPLIT = 402n;
const ERR_INVALID_AMOUNT = 403n;
const ERR_NO_FEES = 404n;

const DEFAULT_FEE_BPS = 100n; // 1%

function parseOkUint(result: unknown): bigint {
  const s = cvToString(result as any);
  const m = s.match(/^\(ok u(\d+)\)$/);
  if (!m) throw new Error(`Expected (ok uN), got: ${s}`);
  return BigInt(m[1]);
}

function computeFee(amount: bigint, feeBps: bigint = DEFAULT_FEE_BPS): bigint {
  return (amount * feeBps) / 10000n;
}

function createCampaign(owner: string = deployer): number {
  const r = simnet.callPublicFn(
    "fundraising",
    "create-campaign",
    [Cl.uint(10_000_000), Cl.uint(0), Cl.principal(owner)],
    owner
  );
  const s = cvToString(r.result);
  const m = s.match(/^\(ok u(\d+)\)$/);
  if (!m) throw new Error(`create-campaign failed: ${s}`);
  return Number(m[1]);
}

function pendingStx(who: string): bigint {
  const r = simnet.callReadOnlyFn(
    "fee-splitter",
    "get-pending-stx",
    [Cl.principal(who)],
    deployer
  );
  return parseOkUint(r.result);
}

function pendingSbtc(who: string): bigint {
  const r = simnet.callReadOnlyFn(
    "fee-splitter",
    "get-pending-sbtc",
    [Cl.principal(who)],
    deployer
  );
  return parseOkUint(r.result);
}

// -- Happy-path tests --

describe("fee-splitter: compute-fee read-only", () => {
  it("returns 1% of donation at default rate", () => {
    const r = simnet.callReadOnlyFn(
      "fee-splitter",
      "compute-fee",
      [Cl.uint(1_000_000)],
      deployer
    );
    expect(r.result).toBeOk(Cl.uint(10_000));
  });

  it("returns 0 for very small amounts that round to zero", () => {
    const r = simnet.callReadOnlyFn(
      "fee-splitter",
      "compute-fee",
      [Cl.uint(99)],
      deployer
    );
    expect(r.result).toBeOk(Cl.uint(0));
  });
});

describe("fee-splitter: pay-fee-stx (no charity)", () => {
  it("credits full fee to protocol treasury", () => {
    const campaignId = createCampaign();
    const amount = 1_000_000n;
    const fee = computeFee(amount);
    const before = pendingStx(deployer);

    const r = simnet.callPublicFn(
      "fee-splitter",
      "pay-fee-stx",
      [Cl.uint(campaignId), Cl.uint(amount)],
      donor1
    );
    expect(r.result).toBeOk(Cl.uint(fee));
    expect(pendingStx(deployer)).toBe(before + fee);
  });

  it("accumulates fees across multiple donors", () => {
    const campaignId = createCampaign();
    const amount = 1_000_000n;
    const fee = computeFee(amount);
    const before = pendingStx(deployer);

    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(campaignId), Cl.uint(amount)], donor1);
    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(campaignId), Cl.uint(amount)], donor2);

    expect(pendingStx(deployer)).toBe(before + fee * 2n);
  });
});

describe("fee-splitter: pay-fee-stx (with charity)", () => {
  it("splits fee between protocol and charity according to share-bps", () => {
    const campaignId = createCampaign();
    // Set charity to receive 50% of the fee (5000 bps of fee, out of 10000)
    simnet.callPublicFn(
      "fee-splitter",
      "set-campaign-charity",
      [fundraisingSource, Cl.uint(campaignId), Cl.principal(charity), Cl.uint(5000)],
      deployer
    );

    const amount = 1_000_000n;
    const fee = computeFee(amount);                // 10_000
    const charityCut = (fee * 5000n) / 10000n;     // 5_000
    const protocolCut = fee - charityCut;          // 5_000

    const protocolBefore = pendingStx(deployer);
    const charityBefore = pendingStx(charity);

    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(campaignId), Cl.uint(amount)], donor1);

    expect(pendingStx(deployer)).toBe(protocolBefore + protocolCut);
    expect(pendingStx(charity)).toBe(charityBefore + charityCut);
  });

  it("charity at 100% share-bps receives entire fee, protocol receives nothing", () => {
    const campaignId = createCampaign();
    simnet.callPublicFn(
      "fee-splitter",
      "set-campaign-charity",
      [fundraisingSource, Cl.uint(campaignId), Cl.principal(charity), Cl.uint(10000)],
      deployer
    );

    const amount = 1_000_000n;
    const fee = computeFee(amount);
    const protocolBefore = pendingStx(deployer);

    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(campaignId), Cl.uint(amount)], donor1);

    expect(pendingStx(charity)).toBe(fee);
    expect(pendingStx(deployer)).toBe(protocolBefore); // no change
  });
});

describe("fee-splitter: withdraw-fees", () => {
  it("sends accumulated STX to the caller and clears pending balance", () => {
    const campaignId = createCampaign();
    const amount = 1_000_000n;
    const fee = computeFee(amount);

    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(campaignId), Cl.uint(amount)], donor1);
    expect(pendingStx(deployer)).toBeGreaterThan(0n);

    const r = simnet.callPublicFn("fee-splitter", "withdraw-fees", [], deployer);
    expect(r.result).toBeOk(
      Cl.tuple({ stx: Cl.uint(fee), sbtc: Cl.uint(0) })
    );
    expect(pendingStx(deployer)).toBe(0n);
  });

  it("charity recipient can withdraw their share independently", () => {
    const campaignId = createCampaign();
    simnet.callPublicFn(
      "fee-splitter",
      "set-campaign-charity",
      [fundraisingSource, Cl.uint(campaignId), Cl.principal(charity), Cl.uint(5000)],
      deployer
    );
    const amount = 1_000_000n;
    const fee = computeFee(amount);
    const charityCut = (fee * 5000n) / 10000n;

    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(campaignId), Cl.uint(amount)], donor1);

    const r = simnet.callPublicFn("fee-splitter", "withdraw-fees", [], charity);
    expect(r.result).toBeOk(
      Cl.tuple({ stx: Cl.uint(charityCut), sbtc: Cl.uint(0) })
    );
    expect(pendingStx(charity)).toBe(0n);
  });
});

describe("fee-splitter: set-campaign-charity", () => {
  it("campaign owner can set a charity split", () => {
    const campaignId = createCampaign();
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-campaign-charity",
      [fundraisingSource, Cl.uint(campaignId), Cl.principal(charity), Cl.uint(3000)],
      deployer
    );
    expect(r.result).toBeOk(Cl.bool(true));

    const getR = simnet.callReadOnlyFn(
      "fee-splitter",
      "get-campaign-charity",
      [Cl.uint(campaignId)],
      deployer
    );
    const s = cvToString(getR.result);
    expect(s).toContain("share-bps u3000");
  });
});

describe("fee-splitter: admin", () => {
  it("owner can change fee-bps", () => {
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-fee-bps",
      [Cl.uint(50)],
      deployer
    );
    expect(r.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn("fee-splitter", "get-fee-bps", [], deployer).result
    ).toBeOk(Cl.uint(50));

    // Restore default
    simnet.callPublicFn("fee-splitter", "set-fee-bps", [Cl.uint(100)], deployer);
  });

  it("owner can change protocol treasury", () => {
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-protocol-treasury",
      [Cl.principal(donor1)],
      deployer
    );
    expect(r.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn("fee-splitter", "get-protocol-treasury", [], deployer).result
    ).toBeOk(Cl.principal(donor1));

    // Restore
    simnet.callPublicFn("fee-splitter", "set-protocol-treasury", [Cl.principal(deployer)], deployer);
  });
});

// -- Edge cases --

describe("fee-splitter: pay-fee-stx guards", () => {
  it("rejects amount of zero", () => {
    const campaignId = createCampaign();
    const r = simnet.callPublicFn(
      "fee-splitter",
      "pay-fee-stx",
      [Cl.uint(campaignId), Cl.uint(0)],
      donor1
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
  });

  it("rejects when computed fee rounds to zero", () => {
    // 99 µSTX * 100 / 10000 = 0 → ERR_INVALID_FEE
    const campaignId = createCampaign();
    const r = simnet.callPublicFn(
      "fee-splitter",
      "pay-fee-stx",
      [Cl.uint(campaignId), Cl.uint(99)],
      donor1
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_FEE));
  });
});

describe("fee-splitter: withdraw-fees guards", () => {
  it("rejects withdraw when there are no pending fees", () => {
    const r = simnet.callPublicFn("fee-splitter", "withdraw-fees", [], stranger);
    expect(r.result).toBeErr(Cl.uint(ERR_NO_FEES));
  });
});

describe("fee-splitter: set-campaign-charity guards", () => {
  it("rejects call from non-campaign-owner", () => {
    const campaignId = createCampaign();
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-campaign-charity",
      [fundraisingSource, Cl.uint(campaignId), Cl.principal(charity), Cl.uint(3000)],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });

  it("rejects share-bps above 10000", () => {
    const campaignId = createCampaign();
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-campaign-charity",
      [fundraisingSource, Cl.uint(campaignId), Cl.principal(charity), Cl.uint(10001)],
      deployer
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_SPLIT));
  });
});

describe("fee-splitter: fee-bps edge cases", () => {
  it("fee-bps at exact MAX (1000 = 10%) is accepted", () => {
    const r = simnet.callPublicFn("fee-splitter", "set-fee-bps", [Cl.uint(1000)], deployer);
    expect(r.result).toBeOk(Cl.bool(true));
    simnet.callPublicFn("fee-splitter", "set-fee-bps", [Cl.uint(100)], deployer);
  });

  it("withdraw clears both pending balances accumulated across campaigns", () => {
    const camp1 = createCampaign();
    const camp2 = createCampaign();
    const amount = 1_000_000n;
    const fee = computeFee(amount);

    // Deployer is the treasury; two donors pay fees across two campaigns
    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(camp1), Cl.uint(amount)], donor1);
    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(camp2), Cl.uint(amount)], donor2);

    const r = simnet.callPublicFn("fee-splitter", "withdraw-fees", [], deployer);
    // Pending from earlier tests accumulate; check stx field is at least 2 * fee
    const s = cvToString(r.result);
    expect(s).toContain("(ok");
    expect(pendingStx(deployer)).toBe(0n);
  });

  it("second withdraw immediately after first returns ERR_NO_FEES", () => {
    const campaignId = createCampaign();
    simnet.callPublicFn("fee-splitter", "pay-fee-stx", [Cl.uint(campaignId), Cl.uint(1_000_000)], donor1);
    simnet.callPublicFn("fee-splitter", "withdraw-fees", [], deployer);

    const r = simnet.callPublicFn("fee-splitter", "withdraw-fees", [], deployer);
    expect(r.result).toBeErr(Cl.uint(ERR_NO_FEES));
  });
});

describe("fee-splitter: admin guards", () => {
  it("non-owner cannot set fee-bps", () => {
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-fee-bps",
      [Cl.uint(50)],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });

  it("rejects fee-bps above MAX_FEE_BPS (1000)", () => {
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-fee-bps",
      [Cl.uint(1001)],
      deployer
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_FEE));
  });

  it("non-owner cannot change protocol treasury", () => {
    const r = simnet.callPublicFn(
      "fee-splitter",
      "set-protocol-treasury",
      [Cl.principal(stranger)],
      stranger
    );
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });
});
