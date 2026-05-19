// Read fundraising contract events directly from Hiro's
// /extended/v1/contract/{id}/events endpoint and decode each print payload
// into a typed event union. Powers activity-feed / per-campaign /
// per-donor history queries.

import { hexToCV } from "@stacks/transactions";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import { getStacksUrl } from "@/lib/stacks-api";

// Each print event always carries `event` (ascii) and `campaignId` (uint).
// Other fields are conditional on the event type.
interface BaseEvent {
  txid: string;
  eventIndex: number;
  campaignId: bigint;
}

export interface CampaignCreatedEvent extends BaseEvent {
  name: "campaign-created";
  owner: string;
  beneficiary: string;
  goal: bigint;
}

export interface CampaignCancelledEvent extends BaseEvent {
  name: "campaign-cancelled";
}

export interface CampaignWithdrawnEvent extends BaseEvent {
  name: "campaign-withdrawn";
}

export interface DonatedEvent extends BaseEvent {
  name: "donated-stx" | "donated-sbtc";
  donor: string;
  amount: bigint;
}

export interface RefundedEvent extends BaseEvent {
  name: "refunded";
  donor: string;
}

export type FundraisingEvent =
  | CampaignCreatedEvent
  | CampaignCancelledEvent
  | CampaignWithdrawnEvent
  | DonatedEvent
  | RefundedEvent;

const CONTRACT_ID = `${FUNDRAISING_CONTRACT.address}.${FUNDRAISING_CONTRACT.name}`;

interface HiroContractLogEvent {
  event_index: number;
  event_type: string;
  tx_id: string;
  contract_log?: {
    contract_id: string;
    topic: string;
    value: { hex: string; repr: string };
  };
}

interface HiroEventsResponse {
  limit: number;
  offset: number;
  results: HiroContractLogEvent[];
}

interface UIntCVShape {
  type: "uint";
  value: bigint;
}

interface PrincipalCVShape {
  type: "address";
  value: string;
}

interface AsciiCVShape {
  type: "ascii";
  value: string;
}

interface TupleCVShape {
  type: "tuple";
  value: Record<string, unknown>;
}

function parseEvent(raw: HiroContractLogEvent): FundraisingEvent | null {
  if (!raw.contract_log || raw.contract_log.topic !== "print") return null;
  const cv = hexToCV(raw.contract_log.value.hex) as unknown as TupleCVShape;
  if (cv.type !== "tuple") return null;

  const fields = cv.value;
  const eventName = (fields.event as AsciiCVShape | undefined)?.value;
  const campaignIdField = fields.campaignId as UIntCVShape | undefined;
  if (!eventName || !campaignIdField) return null;

  const base: BaseEvent = {
    txid: raw.tx_id,
    eventIndex: raw.event_index,
    campaignId: campaignIdField.value,
  };

  switch (eventName) {
    case "campaign-created": {
      const owner = (fields.owner as PrincipalCVShape | undefined)?.value;
      const beneficiary = (fields.beneficiary as PrincipalCVShape | undefined)?.value;
      const goal = (fields.goal as UIntCVShape | undefined)?.value;
      if (!owner || !beneficiary || goal === undefined) return null;
      return { ...base, name: "campaign-created", owner, beneficiary, goal };
    }
    case "campaign-cancelled":
      return { ...base, name: "campaign-cancelled" };
    case "campaign-withdrawn":
      return { ...base, name: "campaign-withdrawn" };
    case "donated-stx":
    case "donated-sbtc": {
      const donor = (fields.donor as PrincipalCVShape | undefined)?.value;
      const amount = (fields.amount as UIntCVShape | undefined)?.value;
      if (!donor || amount === undefined) return null;
      return { ...base, name: eventName, donor, amount };
    }
    case "refunded": {
      const donor = (fields.donor as PrincipalCVShape | undefined)?.value;
      if (!donor) return null;
      return { ...base, name: "refunded", donor };
    }
    default:
      return null;
  }
}

export interface FetchEventsOptions {
  /** Page size; Hiro caps this at 50. */
  limit?: number;
  /** Offset from the most recent event (0 = latest). */
  offset?: number;
}

/**
 * Fetch a single page of fundraising events, most-recent first.
 * Use `fetchAllEvents` for paginated full scans.
 */
export async function fetchEvents(
  options: FetchEventsOptions = {}
): Promise<FundraisingEvent[]> {
  const limit = Math.min(options.limit ?? 50, 50);
  const offset = options.offset ?? 0;
  const url = `${getStacksUrl()}/extended/v1/contract/${CONTRACT_ID}/events?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Hiro contract events fetch failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as HiroEventsResponse;
  return data.results
    .map(parseEvent)
    .filter((e): e is FundraisingEvent => e !== null);
}

/**
 * Walk every contract event by paginating until Hiro returns an empty page.
 * Use sparingly — this can be N requests for old contracts. Genuine
 * whole-history aggregates (e.g. global stats) need this; per-campaign
 * callers should prefer fetchEventsForCampaign, which bounds the scan
 * at the campaign's creation event.
 */
export async function fetchAllEvents(
  pageSize = 50
): Promise<FundraisingEvent[]> {
  const all: FundraisingEvent[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchEvents({ limit: pageSize, offset });
    if (page.length === 0) break;
    all.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

/**
 * Fetch every event for a single campaign by walking pages newest-first
 * and stopping once we pass the campaign's `campaign-created` event (no
 * older event can belong to this campaign). Cost is bounded by the
 * campaign's age relative to the contract, not the contract's total
 * activity. Falls back to a full scan only if Hiro never returns the
 * created event (shouldn't happen for valid ids).
 */
export async function fetchEventsForCampaign(
  campaignId: bigint | number,
  pageSize = 50
): Promise<FundraisingEvent[]> {
  const target = BigInt(campaignId);
  const collected: FundraisingEvent[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchEvents({ limit: pageSize, offset });
    if (page.length === 0) break;
    let sawCreated = false;
    for (const ev of page) {
      if (ev.campaignId !== target) continue;
      collected.push(ev);
      if (ev.name === "campaign-created") sawCreated = true;
    }
    if (sawCreated) break;
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return collected;
}

// -- Convenience filters that callers will commonly want --

export function filterByCampaign(
  events: FundraisingEvent[],
  campaignId: bigint | number
): FundraisingEvent[] {
  const target = BigInt(campaignId);
  return events.filter((e) => e.campaignId === target);
}

export function filterByDonor(
  events: FundraisingEvent[],
  donor: string
): DonatedEvent[] {
  return events.filter(
    (e): e is DonatedEvent =>
      (e.name === "donated-stx" || e.name === "donated-sbtc") &&
      e.donor === donor
  );
}

// -- Block/timestamp enrichment --

// /extended/v1/contract/{id}/events returns the print payload + tx_id
// but no block height or block time. Routes that surface individual
// events (activity, campaign events, donor donations) need both for
// human-readable display, so we batch-fetch tx metadata via
// /extended/v1/tx/multiple and attach it to each event.

export type WithTxData<T> = T & {
  blockHeight: bigint | null;
  blockTime: string | null;
};

export type EnrichedEvent = WithTxData<FundraisingEvent>;

interface HiroTxMultipleEntry {
  found: boolean;
  result?: {
    tx_id: string;
    block_height: number;
    burn_block_time: number;
    burn_block_time_iso: string;
  };
}

// Hiro caps tx_id params per request; 50 keeps URLs comfortably short
// and matches the page size we use elsewhere.
const TX_LOOKUP_CHUNK = 50;

export async function enrichEventsWithTxData<T extends FundraisingEvent>(
  events: T[]
): Promise<WithTxData<T>[]> {
  const uniqueIds = Array.from(new Set(events.map((e) => e.txid)));
  const byTx = new Map<string, { blockHeight: bigint; blockTime: string }>();

  for (let i = 0; i < uniqueIds.length; i += TX_LOOKUP_CHUNK) {
    const chunk = uniqueIds.slice(i, i + TX_LOOKUP_CHUNK);
    const qs = chunk.map((id) => `tx_id=${id}`).join("&");
    const url = `${getStacksUrl()}/extended/v1/tx/multiple?${qs}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Hiro /tx/multiple failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as Record<string, HiroTxMultipleEntry>;
    for (const [txId, entry] of Object.entries(data)) {
      if (entry.found && entry.result) {
        byTx.set(txId, {
          blockHeight: BigInt(entry.result.block_height),
          blockTime: entry.result.burn_block_time_iso,
        });
      }
    }
  }

  return events.map((ev) => {
    const meta = byTx.get(ev.txid);
    return {
      ...ev,
      blockHeight: meta?.blockHeight ?? null,
      blockTime: meta?.blockTime ?? null,
    } as WithTxData<T>;
  });
}
