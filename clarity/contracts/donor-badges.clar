;; Donor Badges -- Soulbound SIP-009 NFT awarded to FundStacks donors.
;;
;; A donor calls `claim-badge` against a campaign they have contributed to.
;; The contract reads their per-campaign contribution from the fundraising
;; contract and mints (or upgrades) a Bronze / Silver / Gold badge based on
;; the STX-equivalent value of that contribution.
;;
;; Badges are non-transferable (soulbound): `transfer` always rejects. This
;; preserves the badge as on-chain proof that *this principal* supported
;; *this campaign* and prevents resale of social proof.

;; -- Trait --

(use-trait donation-source .donation-source-trait.donation-source-trait)

;; -- Constants --

(define-constant CONTRACT_OWNER tx-sender)

;; Errors
(define-constant ERR_NOT_AUTHORIZED (err u200))
(define-constant ERR_NO_DONATION (err u201))
(define-constant ERR_ALREADY_AT_TIER (err u202))
(define-constant ERR_TOKEN_NOT_FOUND (err u203))
(define-constant ERR_SOULBOUND (err u204))
(define-constant ERR_INVALID_RATE (err u205))

;; Tier identifiers
(define-constant TIER_NONE u0)
(define-constant TIER_BRONZE u1)
(define-constant TIER_SILVER u2)
(define-constant TIER_GOLD u3)

;; Tier thresholds, expressed in STX-equivalent microunits.
;; sBTC donations are converted to STX-equivalent via an owner-set rate
;; (see `sbtc-to-stx-numerator` / `sbtc-to-stx-denominator`).
(define-constant THRESHOLD_BRONZE u1000000)        ;; 1 STX
(define-constant THRESHOLD_SILVER u10000000)       ;; 10 STX
(define-constant THRESHOLD_GOLD u100000000)        ;; 100 STX

;; -- Asset --

(define-non-fungible-token donor-badge uint)

;; -- Storage --

(define-data-var last-token-id uint u0)

;; Templated metadata URI. Clients substitute `{id}` when resolving a
;; specific token. Pattern follows the SIP-009 / ERC-1155 convention used
;; by most NFT marketplaces.
(define-data-var token-uri (string-ascii 256) "https://fundstacks.vercel.app/api/badges/{id}.json")

;; sBTC -> STX-equivalent conversion rate, stored as a rational number
;; (numerator / denominator) so the owner can adjust it as sBTC/STX market
;; price moves without redeploying. The default of 100/1 means "1 satoshi
;; counts as 100 microSTX" -- adjust via `set-sbtc-rate`.
(define-data-var sbtc-to-stx-numerator uint u100)
(define-data-var sbtc-to-stx-denominator uint u1)

;; tokenId -> badge facts
(define-map badge-metadata
  uint
  {
    owner: principal,
    campaignId: uint,
    tier: uint,
    mintedAt: uint,
  }
)

;; (campaignId, donor) -> tokenId, so the same donor cannot mint two badges
;; for the same campaign (tier upgrades mutate the existing badge in place).
(define-map donor-badge-id
  {
    campaign-id: uint,
    donor: principal,
  }
  uint
)

;; -- SIP-009 read-only views --

(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (id uint))
  (begin
    id
    (ok (some (var-get token-uri)))
  )
)

(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? donor-badge id))
)

;; -- FundStacks-specific views --

(define-read-only (get-badge-metadata (id uint))
  (map-get? badge-metadata id)
)

(define-read-only (get-donor-badge-id
    (campaign-id uint)
    (donor principal)
  )
  (map-get? donor-badge-id {
    campaign-id: campaign-id,
    donor: donor,
  })
)

;; Read the donor's per-campaign STX and sBTC contributions from the
;; given donation source and return their combined STX-equivalent value.
;; This is the input to tier computation.
;;
;; The source contract must implement donation-source-trait, which the
;; live fundraising contract satisfies via its get-stx-donation and
;; get-sbtc-donation read-only functions.
(define-public (get-donor-contribution-stx-equivalent
    (source <donation-source>)
    (campaign-id uint)
    (donor principal)
  )
  (let (
      (stx-amount (try! (contract-call? source get-stx-donation campaign-id donor)))
      (sbtc-amount (try! (contract-call? source get-sbtc-donation campaign-id donor)))
      (num (var-get sbtc-to-stx-numerator))
      (den (var-get sbtc-to-stx-denominator))
    )
    (ok (+ stx-amount (/ (* sbtc-amount num) den)))
  )
)

;; Convenience: tier the donor would currently qualify for, computed
;; from live on-chain donation state. Useful for previewing a UI badge
;; before the donor calls `claim-badge`.
(define-public (preview-tier
    (source <donation-source>)
    (campaign-id uint)
    (donor principal)
  )
  (let ((amount (try! (get-donor-contribution-stx-equivalent source campaign-id donor))))
    (ok (tier-for-amount amount))
  )
)

;; Pure tier-from-amount helper. Exposed read-only so the front-end can
;; preview the tier a donor would receive before they spend gas on
;; `claim-badge`.
(define-read-only (tier-for-amount (amount uint))
  (if (>= amount THRESHOLD_GOLD)
    TIER_GOLD
    (if (>= amount THRESHOLD_SILVER)
      TIER_SILVER
      (if (>= amount THRESHOLD_BRONZE)
        TIER_BRONZE
        TIER_NONE
      )
    )
  )
)

;; -- Public functions --

;; Claim or upgrade a donor badge for a campaign.
;;
;; Idempotent within a tier: calling twice without donating more returns
;; err-already-at-tier. The first call mints a new SIP-009 token; later
;; calls that cross a tier threshold mutate the existing badge's metadata
;; in place (same tokenId, new tier), so a donor never holds more than
;; one badge per campaign.
(define-public (claim-badge
    (source <donation-source>)
    (campaign-id uint)
  )
  (let (
      (donor tx-sender)
      (contribution (try! (get-donor-contribution-stx-equivalent source campaign-id donor)))
      (new-tier (tier-for-amount contribution))
      (existing-id (map-get? donor-badge-id {
        campaign-id: campaign-id,
        donor: donor,
      }))
    )
    (asserts! (> new-tier TIER_NONE) ERR_NO_DONATION)
    (match existing-id
      prev-id
      (let ((meta (unwrap! (map-get? badge-metadata prev-id) ERR_TOKEN_NOT_FOUND)))
        (asserts! (> new-tier (get tier meta)) ERR_ALREADY_AT_TIER)
        (map-set badge-metadata prev-id (merge meta { tier: new-tier }))
        (print {
          event: "badge-upgraded",
          tokenId: prev-id,
          campaignId: campaign-id,
          donor: donor,
          tier: new-tier,
          previousTier: (get tier meta),
        })
        (ok prev-id)
      )
      (let ((id (+ (var-get last-token-id) u1)))
        (try! (nft-mint? donor-badge id donor))
        (var-set last-token-id id)
        (map-set badge-metadata id {
          owner: donor,
          campaignId: campaign-id,
          tier: new-tier,
          mintedAt: stacks-block-time,
        })
        (map-set donor-badge-id
          { campaign-id: campaign-id, donor: donor }
          id
        )
        (print {
          event: "badge-claimed",
          tokenId: id,
          campaignId: campaign-id,
          donor: donor,
          tier: new-tier,
        })
        (ok id)
      )
    )
  )
)

;; SIP-009 trait conformance -- and the soulbound enforcement point.
;;
;; A donor badge is on-chain proof that *this specific principal*
;; supported *this specific campaign*. Allowing transfer would let donors
;; resell social proof on secondary markets, defeating the purpose. So
;; this function always rejects with err-soulbound, regardless of who is
;; calling, who owns the token, or who the proposed recipient is.
(define-public (transfer
    (id uint)
    (sender principal)
    (recipient principal)
  )
  (begin
    id
    sender
    recipient
    ERR_SOULBOUND
  )
)

;; -- Owner-only admin --

;; Update the templated metadata URI. The base is stored as a single
;; string so the contract doesn't need to do on-chain integer-to-ascii
;; conversion for every read; clients substitute `{id}` themselves.
(define-public (set-token-uri (new-uri (string-ascii 256)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (var-set token-uri new-uri)
    (print {
      event: "token-uri-updated",
      uri: new-uri,
    })
    (ok true)
  )
)

;; Adjust the sBTC-to-STX conversion rate that feeds tier resolution.
;; Owner uses this to track sBTC/STX market price moves so a 1-sat
;; donation always counts as roughly its current STX-equivalent value.
;; Denominator must be non-zero (division-by-zero guard).
(define-public (set-sbtc-rate
    (numerator uint)
    (denominator uint)
  )
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (> denominator u0) ERR_INVALID_RATE)
    (var-set sbtc-to-stx-numerator numerator)
    (var-set sbtc-to-stx-denominator denominator)
    (print {
      event: "sbtc-rate-updated",
      numerator: numerator,
      denominator: denominator,
    })
    (ok true)
  )
)
