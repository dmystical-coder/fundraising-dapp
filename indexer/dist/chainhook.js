import crypto from "node:crypto";
function stableJson(obj) {
    // Deterministic-ish stringify for hashing: sort object keys recursively.
    const seen = new WeakSet();
    const normalize = (value) => {
        if (value && typeof value === "object") {
            if (seen.has(value))
                return "[Circular]";
            seen.add(value);
            if (Array.isArray(value))
                return value.map(normalize);
            const record = value;
            return Object.keys(record)
                .sort((a, b) => a.localeCompare(b))
                .reduce((acc, key) => {
                acc[key] = normalize(record[key]);
                return acc;
            }, {});
        }
        return value;
    };
    return JSON.stringify(normalize(obj));
}
export function computeEventUid(payload) {
    return crypto.createHash("sha256").update(stableJson(payload)).digest("hex");
}
function toBigIntSafe(v) {
    if (typeof v === "bigint")
        return v;
    if (typeof v === "number" && Number.isFinite(v))
        return BigInt(Math.trunc(v));
    if (typeof v === "string" && /^\d+$/.test(v))
        return BigInt(v);
    return undefined;
}
function isRecord(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
}
/**
 * Best-effort extraction of Clarity print logs produced by your contract.
 *
 * Chainhook payload shapes can vary by version; this extractor is intentionally
 * defensive and prefers storing raw payloads over failing hard.
 */
export function extractFundraisingEvents(payload, options) {
    const results = [];
    const visit = (node, context) => {
        if (Array.isArray(node)) {
            for (const item of node)
                visit(item, context);
            return;
        }
        if (!isRecord(node))
            return;
        const maybeTxid = typeof node.txid === "string" ? node.txid : undefined;
        const maybeBlockHeight = toBigIntSafe(node.block_height ?? node.blockHeight);
        const maybeContractIdentifier = typeof node.contract_identifier === "string"
            ? node.contract_identifier
            : typeof node.contractIdentifier === "string"
                ? node.contractIdentifier
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
        const eventType = typeof node.type === "string"
            ? node.type
            : typeof node.event_type === "string"
                ? node.event_type
                : undefined;
        const looksLikePrint = eventType === "smart_contract_log" || eventType === "print" || eventType === "print_event";
        if (looksLikePrint) {
            const contractIdentifier = maybeContractIdentifier ?? context.contractIdentifier;
            if (options?.expectedContractIdentifier &&
                contractIdentifier &&
                contractIdentifier !== options.expectedContractIdentifier) {
                // Ignore prints from other contracts.
            }
            else {
                // Try to find decoded clarity value if present.
                // Common field names: `value`, `decoded_clarity_value`, `decoded_value`.
                const rawValue = node.value ?? node.decoded_clarity_value ?? node.decoded_value ?? node;
                let eventName;
                let campaignId;
                let donor;
                let owner;
                let beneficiary;
                let token;
                let amount;
                let ts;
                if (isRecord(rawValue)) {
                    const ev = rawValue.event;
                    if (typeof ev === "string")
                        eventName = ev;
                    if (typeof rawValue.donor === "string")
                        donor = rawValue.donor;
                    if (typeof rawValue.owner === "string")
                        owner = rawValue.owner;
                    if (typeof rawValue.beneficiary === "string")
                        beneficiary = rawValue.beneficiary;
                    if (typeof rawValue.token === "string")
                        token = rawValue.token;
                    campaignId = toBigIntSafe(rawValue.campaignId ?? rawValue.campaign_id);
                    amount = toBigIntSafe(rawValue.amount ?? rawValue.amountUstx ?? rawValue.amountSats);
                    ts = toBigIntSafe(rawValue.ts ?? rawValue.timestamp);
                }
                // Only treat it as a fundraising event if it has our expected fields.
                // This keeps the table clean even if other prints slip through.
                if (eventName && (eventName.includes("campaign-") || eventName.includes("donated-") || eventName.includes("refunded"))) {
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
        for (const value of Object.values(node))
            visit(value, nextContext);
    };
    visit(payload, {});
    return results;
}
export function extractTopLevelMeta(payload) {
    if (!payload || typeof payload !== "object")
        return {};
    const p = payload;
    return {
        hookUuid: typeof p.uuid === "string" ? p.uuid : typeof p.hook_uuid === "string" ? p.hook_uuid : undefined,
        chain: typeof p.chain === "string" ? p.chain : undefined,
        network: typeof p.network === "string" ? p.network : undefined,
        action: typeof p.action === "string" ? p.action : undefined,
        blockHeight: toBigIntSafe(p.block_height ?? p.blockHeight),
        txid: typeof p.txid === "string" ? p.txid : undefined,
        contractIdentifier: typeof p.contract_identifier === "string"
            ? p.contract_identifier
            : typeof p.contractIdentifier === "string"
                ? p.contractIdentifier
                : undefined,
    };
}
