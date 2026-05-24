import { describe, expect, it } from "vitest";
import { Cl, cvToString } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

// -- Setup --

const simnet = await initSimnet();
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const creator = accounts.get("wallet_1")!;
const donor1 = accounts.get("wallet_2")!;
const donor2 = accounts.get("wallet_3")!;
const donor3 = accounts.get("wallet_4")!;

const fundraisingSource = Cl.contractPrincipal(deployer, "fundraising");

// Error codes mirror campaign-milestones.clar
const ERR_NOT_AUTHORIZED = 500n;
const ERR_ESCROW_EXISTS = 501n;
const ERR_ESCROW_NOT_FOUND = 502n;
const ERR_INVALID_TRANCHE_COUNT = 503n;
const ERR_INVALID_THRESHOLD = 504n;
const ERR_INVALID_AMOUNT = 505n;
const ERR_TRANCHE_NOT_FOUND = 506n;
const ERR_NOT_A_DONOR = 507n;
const ERR_ALREADY_VOTED = 508n;
const ERR_INSUFFICIENT_VOTES = 509n;
const ERR_ALREADY_CLAIMED = 510n;

const VOTE_CAP_USTX = 100_000_000n; // 100 STX

function parseOkUint(result: unknown): bigint {
  const s = cvToString(result as any);
  const m = s.match(/^\(ok u(\d+)\)$/);
  if (!m) throw new Error(`Expected (ok uN), got: ${s}`);
  return BigInt(m[1]);
}

function createCampaign(owner: string = creator): number {
  const r = simnet.callPublicFn(
    "fundraising",
    "create-campaign",
    [Cl.uint(1_000_000_000), Cl.uint(0), Cl.principal(owner)],
    owner
  );
  const s = cvToString(r.result);
  const m = s.match(/^\(ok u(\d+)\)$/);
  if (!m) throw new Error(`create-campaign failed: ${s}`);
  return Number(m[1]);
}

function donateStx(campaignId: number, donor: string, amount: bigint): void {
  const r = simnet.callPublicFn(
    "fundraising",
    "donate-stx",
    [Cl.uint(campaignId), Cl.uint(amount)],
    donor
  );
  const s = cvToString(r.result);
  if (!s.startsWith("(ok")) throw new Error(`donate-stx failed: ${s}`);
}

function createEscrow(
  campaignId: number,
  amount: bigint,
  trancheCount: bigint,
  releaseThreshold: bigint,
  caller: string = creator
) {
  return simnet.callPublicFn(
    "campaign-milestones",
    "create-escrow",
    [
      fundraisingSource,
      Cl.uint(campaignId),
      Cl.uint(amount),
      Cl.uint(trancheCount),
      Cl.uint(releaseThreshold),
    ],
    caller
  );
}

function voteRelease(
  campaignId: number,
  trancheId: number,
  caller: string
) {
  return simnet.callPublicFn(
    "campaign-milestones",
    "vote-release",
    [fundraisingSource, Cl.uint(campaignId), Cl.uint(trancheId)],
    caller
  );
}

function claimTranche(
  campaignId: number,
  trancheId: number,
  caller: string = creator
) {
  return simnet.callPublicFn(
    "campaign-milestones",
    "claim-tranche",
    [Cl.uint(campaignId), Cl.uint(trancheId)],
    caller
  );
}

function escrowInfoStr(campaignId: number): string {
  const r = simnet.callReadOnlyFn(
    "campaign-milestones",
    "get-escrow-info",
    [Cl.uint(campaignId)],
    deployer
  );
  return cvToString(r.result);
}

function trancheInfoStr(campaignId: number, trancheId: number): string {
  const r = simnet.callReadOnlyFn(
    "campaign-milestones",
    "get-tranche-info",
    [Cl.uint(campaignId), Cl.uint(trancheId)],
    deployer
  );
  return cvToString(r.result);
}

// -- Happy-path tests --

describe("campaign-milestones: create-escrow happy path", () => {
  it("campaign owner creates an escrow with the expected fields stored", () => {
    const campaignId = createCampaign();
    const amount = 12_000_000n;
    const trancheCount = 3n;
    const threshold = 50_000_000n;

    const r = createEscrow(campaignId, amount, trancheCount, threshold);
    expect(r.result).toBeOk(Cl.bool(true));

    const s = escrowInfoStr(campaignId);
    expect(s).toContain(`(balance u${amount})`);
    expect(s).toContain(`(tranche-count u${trancheCount})`);
    expect(s).toContain(`(tranche-amount u${amount / trancheCount})`);
    expect(s).toContain(`(release-threshold u${threshold})`);
    expect(s).toContain(`(owner ${creator})`);
  });

  it("supports the full 1-4 tranche range", () => {
    for (const n of [1n, 2n, 3n, 4n]) {
      const campaignId = createCampaign();
      const r = createEscrow(campaignId, 4_000_000n, n, 10_000_000n);
      expect(r.result).toBeOk(Cl.bool(true));
    }
  });
});

describe("campaign-milestones: vote-release happy path", () => {
  it("returns full contribution as weight when below the cap", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n); // 30 STX, below 100 cap
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);

    const r = voteRelease(campaignId, 0, donor1);
    expect(r.result).toBeOk(Cl.uint(30_000_000n));
  });

  it("caps weight at VOTE_CAP_USTX for whale donors", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 250_000_000n); // 250 STX, above cap
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);

    const r = voteRelease(campaignId, 0, donor1);
    expect(r.result).toBeOk(Cl.uint(VOTE_CAP_USTX));
  });

  it("accumulates weight across multiple donors on the same tranche", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n);
    donateStx(campaignId, donor2, 25_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 100_000_000n);

    voteRelease(campaignId, 0, donor1);
    voteRelease(campaignId, 0, donor2);

    const s = trancheInfoStr(campaignId, 0);
    expect(s).toContain("(vote-weight u55000000)");
  });

  it("flips has-voted to true for the voting donor only", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n);
    donateStx(campaignId, donor2, 25_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 100_000_000n);

    voteRelease(campaignId, 0, donor1);

    const votedR = simnet.callReadOnlyFn(
      "campaign-milestones",
      "has-voted",
      [Cl.uint(campaignId), Cl.uint(0), Cl.principal(donor1)],
      deployer
    );
    expect(votedR.result).toStrictEqual(Cl.bool(true));

    const notVotedR = simnet.callReadOnlyFn(
      "campaign-milestones",
      "has-voted",
      [Cl.uint(campaignId), Cl.uint(0), Cl.principal(donor2)],
      deployer
    );
    expect(notVotedR.result).toStrictEqual(Cl.bool(false));
  });
});

describe("campaign-milestones: claim-tranche happy path", () => {
  it("owner claims one tranche after threshold met; balance drops by tranche-amount", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 60_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);

    voteRelease(campaignId, 0, donor1);

    const r = claimTranche(campaignId, 0);
    expect(r.result).toBeOk(Cl.uint(4_000_000n)); // 12M / 3

    const s = escrowInfoStr(campaignId);
    expect(s).toContain("(balance u8000000)");

    const tr = trancheInfoStr(campaignId, 0);
    expect(tr).toContain("(released true)");
    expect(tr).toContain("(claimed true)");
  });

  it("tranches can be claimed out of order once each threshold is met", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 80_000_000n);
    createEscrow(campaignId, 9_000_000n, 3n, 50_000_000n);

    // Vote on tranches 2 and 0 only -- skip 1
    voteRelease(campaignId, 2, donor1);
    voteRelease(campaignId, 0, donor1);

    // Claim 2 first, then 0
    expect(claimTranche(campaignId, 2).result).toBeOk(Cl.uint(3_000_000n));
    expect(claimTranche(campaignId, 0).result).toBeOk(Cl.uint(3_000_000n));

    // Tranche 1 still unreleased
    const s1 = trancheInfoStr(campaignId, 1);
    expect(s1).toContain("none"); // never voted on, so no record
  });
});

describe("campaign-milestones: full multi-tranche flow", () => {
  it("create -> vote -> claim across all 3 tranches drains balance to zero", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 60_000_000n);
    donateStx(campaignId, donor2, 30_000_000n);
    const amount = 9_000_000n;
    const threshold = 80_000_000n;

    createEscrow(campaignId, amount, 3n, threshold);

    for (let trancheId = 0; trancheId < 3; trancheId++) {
      voteRelease(campaignId, trancheId, donor1); // 60M
      voteRelease(campaignId, trancheId, donor2); // +30M = 90M > 80M
      const r = claimTranche(campaignId, trancheId);
      expect(r.result).toBeOk(Cl.uint(3_000_000n));
    }

    const s = escrowInfoStr(campaignId);
    expect(s).toContain("(balance u0)");
  });
});

describe("campaign-milestones: read-only constants", () => {
  it("get-vote-cap returns VOTE_CAP_USTX", () => {
    const r = simnet.callReadOnlyFn(
      "campaign-milestones",
      "get-vote-cap",
      [],
      deployer
    );
    expect(r.result).toStrictEqual(Cl.uint(VOTE_CAP_USTX));
  });

  it("get-tranche-bounds returns min=1, max=4", () => {
    const r = simnet.callReadOnlyFn(
      "campaign-milestones",
      "get-tranche-bounds",
      [],
      deployer
    );
    const s = cvToString(r.result);
    expect(s).toContain("(min u1)");
    expect(s).toContain("(max u4)");
  });
});

// -- Edge-case tests --

describe("campaign-milestones: create-escrow edge cases", () => {
  it("rejects non-owner with ERR_NOT_AUTHORIZED", () => {
    const campaignId = createCampaign();
    const r = createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n, donor1);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });

  it("rejects zero amount with ERR_INVALID_AMOUNT", () => {
    const campaignId = createCampaign();
    const r = createEscrow(campaignId, 0n, 3n, 50_000_000n);
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
  });

  it("rejects tranche-count = 0 with ERR_INVALID_TRANCHE_COUNT", () => {
    const campaignId = createCampaign();
    const r = createEscrow(campaignId, 12_000_000n, 0n, 50_000_000n);
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_TRANCHE_COUNT));
  });

  it("rejects tranche-count > MAX with ERR_INVALID_TRANCHE_COUNT", () => {
    const campaignId = createCampaign();
    const r = createEscrow(campaignId, 12_000_000n, 5n, 50_000_000n);
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_TRANCHE_COUNT));
  });

  it("rejects zero release-threshold with ERR_INVALID_THRESHOLD", () => {
    const campaignId = createCampaign();
    const r = createEscrow(campaignId, 12_000_000n, 3n, 0n);
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_THRESHOLD));
  });

  it("rejects duplicate create on the same campaign with ERR_ESCROW_EXISTS", () => {
    const campaignId = createCampaign();
    const first = createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);
    expect(first.result).toBeOk(Cl.bool(true));

    const second = createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);
    expect(second.result).toBeErr(Cl.uint(ERR_ESCROW_EXISTS));
  });
});

describe("campaign-milestones: vote-release edge cases", () => {
  it("rejects vote on non-existent escrow with ERR_ESCROW_NOT_FOUND", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n);

    // No escrow created
    const r = voteRelease(campaignId, 0, donor1);
    expect(r.result).toBeErr(Cl.uint(ERR_ESCROW_NOT_FOUND));
  });

  it("rejects non-donor with ERR_NOT_A_DONOR", () => {
    const campaignId = createCampaign();
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);

    // donor3 never donated to this campaign
    const r = voteRelease(campaignId, 0, donor3);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_A_DONOR));
  });

  it("rejects double-vote on the same tranche with ERR_ALREADY_VOTED", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);

    const first = voteRelease(campaignId, 0, donor1);
    expect(first.result).toBeOk(Cl.uint(30_000_000n));

    const second = voteRelease(campaignId, 0, donor1);
    expect(second.result).toBeErr(Cl.uint(ERR_ALREADY_VOTED));
  });

  it("rejects vote on out-of-range tranche-id with ERR_TRANCHE_NOT_FOUND", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);

    // Valid tranches are 0, 1, 2 -- 3 is out of range
    const r = voteRelease(campaignId, 3, donor1);
    expect(r.result).toBeErr(Cl.uint(ERR_TRANCHE_NOT_FOUND));
  });

  it("same donor can vote on different tranches", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);

    expect(voteRelease(campaignId, 0, donor1).result).toBeOk(
      Cl.uint(30_000_000n)
    );
    expect(voteRelease(campaignId, 1, donor1).result).toBeOk(
      Cl.uint(30_000_000n)
    );
    expect(voteRelease(campaignId, 2, donor1).result).toBeOk(
      Cl.uint(30_000_000n)
    );
  });
});

describe("campaign-milestones: claim-tranche edge cases", () => {
  it("rejects claim on non-existent escrow with ERR_ESCROW_NOT_FOUND", () => {
    const campaignId = createCampaign();
    const r = claimTranche(campaignId, 0);
    expect(r.result).toBeErr(Cl.uint(ERR_ESCROW_NOT_FOUND));
  });

  it("rejects non-owner with ERR_NOT_AUTHORIZED", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 60_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);
    voteRelease(campaignId, 0, donor1);

    const r = claimTranche(campaignId, 0, donor1);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_AUTHORIZED));
  });

  it("rejects claim on out-of-range tranche-id with ERR_TRANCHE_NOT_FOUND", () => {
    const campaignId = createCampaign();
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);
    const r = claimTranche(campaignId, 3);
    expect(r.result).toBeErr(Cl.uint(ERR_TRANCHE_NOT_FOUND));
  });

  it("rejects claim before threshold met with ERR_INSUFFICIENT_VOTES", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 30_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 100_000_000n); // threshold 100M

    // donor1 only has 30M of voting weight, threshold is 100M
    voteRelease(campaignId, 0, donor1);
    const r = claimTranche(campaignId, 0);
    expect(r.result).toBeErr(Cl.uint(ERR_INSUFFICIENT_VOTES));
  });

  it("rejects claim with no votes at all on the tranche with ERR_INSUFFICIENT_VOTES", () => {
    const campaignId = createCampaign();
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);
    // No votes cast on any tranche
    const r = claimTranche(campaignId, 0);
    expect(r.result).toBeErr(Cl.uint(ERR_INSUFFICIENT_VOTES));
  });

  it("rejects double-claim on the same tranche with ERR_ALREADY_CLAIMED", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 60_000_000n);
    createEscrow(campaignId, 12_000_000n, 3n, 50_000_000n);
    voteRelease(campaignId, 0, donor1);

    const first = claimTranche(campaignId, 0);
    expect(first.result).toBeOk(Cl.uint(4_000_000n));

    const second = claimTranche(campaignId, 0);
    expect(second.result).toBeErr(Cl.uint(ERR_ALREADY_CLAIMED));
  });
});

describe("campaign-milestones: floor-division remainder is locked dust", () => {
  it("10 STX across 3 tranches leaves 1 microSTX of dust after all claims", () => {
    const campaignId = createCampaign();
    donateStx(campaignId, donor1, 60_000_000n);

    const amount = 10n; // 10 microSTX, divides as 3, 3, 3 with 1 remainder
    createEscrow(campaignId, amount, 3n, 50_000_000n);

    for (let trancheId = 0; trancheId < 3; trancheId++) {
      voteRelease(campaignId, trancheId, donor1);
      const r = claimTranche(campaignId, trancheId);
      expect(r.result).toBeOk(Cl.uint(3n));
    }

    const s = escrowInfoStr(campaignId);
    expect(s).toContain("(balance u1)"); // 1 microSTX dust locked
  });
});
