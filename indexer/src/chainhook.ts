import crypto from "node:crypto";

export type ExtractedFundraisingEvent = {
  eventUid: string;
  eventName: string;
  campaignId?: bigint;
  donor?: string;
  owner?: string;
  beneficiary?: string;
  token?: string;
  amount?: bigint;
  ts?: bigint;
  txid?: string;
  blockHeight?: bigint;
  contractIdentifier?: string;
  raw: unknown;
};

function stableJson(obj: unknown): string {
  // Deterministic-ish stringify for hashing: sort object keys recursively.
  const seen = new WeakSet<object>();
  const normalize = (value: unknown): unknown => {
    if (value && typeof value === "object") {
      if (seen.has(value as object)) return "[Circular]";
      seen.add(value as object);

      if (Array.isArray(value)) return value.map(normalize);

      const record = value as Record<string, unknown>;
      return Object.keys(record)
        .sort((a, b) => a.localeCompare(b))
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = normalize(record[key]);
          return acc;
        }, {});
    }
    return value;
  };

  return JSON.stringify(normalize(obj));
}

export function computeEventUid(payload: unknown): string {
  return crypto.createHash("sha256").update(stableJson(payload)).digest("hex");
}

function toBigIntSafe(v: unknown): bigint | undefined {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
  if (typeof v === "string" && /^\d+$/.test(v)) return BigInt(v);
  return undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function extractFromClarityRepr(repr: string): {
  eventName?: string;
  campaignId?: bigint;
  donor?: string;
  owner?: string;
  beneficiary?: string;
  token?: string;
  amount?: bigint;
  ts?: bigint;
} {
  // Example: (tuple (event "donated-stx") (campaignId u1) (amount u1000) (donor 'SP...))
  const pickString = (key: string) => {
    const m = repr.match(new RegExp(`\\(${key}\\s+\"([^\"]+)\"\\)`));
    return m?.[1];
  };
  const pickUint = (key: string) => {
    const m = repr.match(new RegExp(`\\(${key}\\s+u(\\d+)\\)`));
    return m?.[1] ? BigInt(m[1]) : undefined;
  };
  const pickPrincipal = (key: string) => {
    const m = repr.match(new RegExp(`\\(${key}\\s+'([^\\s\\)]+)\\)`));
    return m?.[1];
  };

  const eventName = pickString("event");
  const campaignId = pickUint("campaignId") ?? pickUint("campaign_id");

  // amount is sometimes emitted under alternative keys.
  const amount =
    pickUint("amount") ??
    pickUint("amountUstx") ??
    pickUint("amount_ustx") ??
    pickUint("amountSats") ??
    pickUint("amount_sats");

  const ts = pickUint("ts") ?? pickUint("timestamp");

  return {
    eventName,
    campaignId,
    donor: pickPrincipal("donor"),
    owner: pickPrincipal("owner"),
    beneficiary: pickPrincipal("beneficiary"),
    token: pickString("token"),
    amount,
    ts,
  };
}

/**
 * Best-effort extraction of Clarity print logs produced by your contract.
 *
 * Chainhook payload shapes can vary by version; this extractor is intentionally
 * defensive and prefers storing raw payloads over failing hard.
 */
export function extractFundraisingEvents(
  payload: unknown,
  options?: { expectedContractIdentifier?: string }
): ExtractedFundraisingEvent[] {
  const results: ExtractedFundraisingEvent[] = [];

  const visit = (
    node: unknown,
    context: {
      action?: string;
      hookUuid?: string;
      chain?: string;
      network?: string;
      blockHeight?: bigint;
      txid?: string;
      contractIdentifier?: string;
    }
  ) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item, context);
      return;
    }
    if (!isRecord(node)) return;

    const maybeTxid = typeof node.txid === "string" ? node.txid : undefined;
    const maybeBlockHeight = toBigIntSafe(
      node.block_height ?? node.blockHeight
    );
    const maybeContractIdentifier =
      typeof node.contract_identifier === "string"
        ? node.contract_identifier
        : typeof node.contractIdentifier === "string"
        ? node.contractIdentifier
        : isRecord(node.metadata) &&
          typeof node.metadata.contract_identifier === "string"
        ? (node.metadata.contract_identifier as string)
        : undefined;

    const nextContext = {
      ...context,
      txid: maybeTxid ?? context.txid,
      blockHeight: maybeBlockHeight ?? context.blockHeight,
      contractIdentifier: maybeContractIdentifier ?? context.contractIdentifier,
    };

    // Detect a print event node. Different payloads may embed it as:
    // - { type: "smart_contract_log", contract_identifier, value, ... }
    // - { event_type: "smart_contract_log", ... }
    const eventType =
      typeof node.type === "string"
        ? node.type
        : typeof node.event_type === "string"
        ? node.event_type
        : undefined;

    const looksLikePrint =
      eventType === "smart_contract_log" ||
      eventType === "contract_log" ||
      eventType === "print" ||
      eventType === "print_event";

    if (looksLikePrint) {
      const contractIdentifier =
        maybeContractIdentifier ?? context.contractIdentifier;
      if (
        options?.expectedContractIdentifier &&
        contractIdentifier &&
        contractIdentifier !== options.expectedContractIdentifier
      ) {
        // Ignore prints from other contracts.
      } else {
        // Try to find decoded clarity value if present.
        // Common field names: `value`, `decoded_clarity_value`, `decoded_value`.
        // Hiro Chainhooks API contract_log operations put the log value at `metadata.value`.
        const rawValue =
          node.value ??
          node.decoded_clarity_value ??
          node.decoded_value ??
          (isRecord(node.metadata) ? node.metadata.value : undefined) ??
          node;

        let eventName: string | undefined;
        let campaignId: bigint | undefined;
        let donor: string | undefined;
        let owner: string | undefined;
        let beneficiary: string | undefined;
        let token: string | undefined;
        let amount: bigint | undefined;
        let ts: bigint | undefined;

        if (typeof rawValue === "string") {
          const parsed = extractFromClarityRepr(rawValue);
          eventName = parsed.eventName;
          campaignId = parsed.campaignId;
          donor = parsed.donor;
          owner = parsed.owner;
          beneficiary = parsed.beneficiary;
          token = parsed.token;
          amount = parsed.amount;
          ts = parsed.ts;
        } else if (isRecord(rawValue)) {
          // Hiro Chainhooks API may represent the log value as { hex, repr }.
          if (typeof rawValue.repr === "string") {
            const parsed = extractFromClarityRepr(rawValue.repr);
            eventName = parsed.eventName;
            campaignId = parsed.campaignId;
            donor = parsed.donor;
            owner = parsed.owner;
            beneficiary = parsed.beneficiary;
            token = parsed.token;
            amount = parsed.amount;
            ts = parsed.ts;
          }

          const ev = rawValue.event;
          if (typeof ev === "string") eventName = ev;
          if (typeof rawValue.donor === "string") donor = rawValue.donor;
          if (typeof rawValue.owner === "string") owner = rawValue.owner;
          if (typeof rawValue.beneficiary === "string")
            beneficiary = rawValue.beneficiary;
          if (typeof rawValue.token === "string") token = rawValue.token;

          campaignId = toBigIntSafe(
            rawValue.campaignId ?? rawValue.campaign_id
          );
          amount = toBigIntSafe(
            rawValue.amount ?? rawValue.amountUstx ?? rawValue.amountSats
          );
          ts = toBigIntSafe(rawValue.ts ?? rawValue.timestamp);
        }

        // Only treat it as a fundraising event if it has our expected fields.
        // This keeps the table clean even if other prints slip through.
        if (
          eventName &&
          (eventName.includes("campaign-") ||
            eventName.includes("donated-") ||
            eventName.includes("refunded"))
        ) {
          const eventUid = computeEventUid({ ctx: nextContext, node });
          results.push({
            eventUid,
            eventName,
            campaignId,
            donor,
            owner,
            beneficiary,
            token,
            amount,
            ts,
            txid: nextContext.txid,
            blockHeight: nextContext.blockHeight,
            contractIdentifier,
            raw: { ctx: nextContext, node },
          });
        }
      }
    }

    // Recurse through all fields.
    for (const value of Object.values(node)) visit(value, nextContext);
  };

  visit(payload, {});
  return results;
}

export function extractTopLevelMeta(payload: unknown): {
  hookUuid?: string;
  chain?: string;
  network?: string;
  action?: string;
  blockHeight?: bigint;
  txid?: string;
  contractIdentifier?: string;
} {
  if (!payload || typeof payload !== "object") return {};
  const p = payload as Record<string, unknown>;

  return {
    hookUuid:
      typeof p.uuid === "string"
        ? p.uuid
        : typeof p.hook_uuid === "string"
        ? (p.hook_uuid as string)
        : undefined,
    chain: typeof p.chain === "string" ? p.chain : undefined,
    network: typeof p.network === "string" ? p.network : undefined,
    action: typeof p.action === "string" ? p.action : undefined,
    blockHeight: toBigIntSafe(p.block_height ?? p.blockHeight),
    txid: typeof p.txid === "string" ? p.txid : undefined,
    contractIdentifier:
      typeof p.contract_identifier === "string"
        ? (p.contract_identifier as string)
        : typeof p.contractIdentifier === "string"
        ? (p.contractIdentifier as string)
        : undefined,
  };
}
