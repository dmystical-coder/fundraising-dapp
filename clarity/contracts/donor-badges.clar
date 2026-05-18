;; Donor Badges — Soulbound SIP-009 NFT awarded to FundStacks donors.
;;
;; A donor calls `claim-badge` against a campaign they have contributed to.
;; The contract reads their per-campaign contribution from the fundraising
;; contract and mints (or upgrades) a Bronze / Silver / Gold badge based on
;; the STX-equivalent value of that contribution.
;;
;; Badges are non-transferable (soulbound): `transfer` always rejects. This
;; preserves the badge as on-chain proof that *this principal* supported
;; *this campaign* and prevents resale of social proof.

;; -- Constants --

(define-constant contract-owner tx-sender)

;; Errors
(define-constant err-not-authorized (err u200))
(define-constant err-no-donation (err u201))
(define-constant err-already-at-tier (err u202))
(define-constant err-token-not-found (err u203))
(define-constant err-soulbound (err u204))
(define-constant err-invalid-rate (err u205))

;; Tier identifiers
(define-constant tier-none u0)
(define-constant tier-bronze u1)
(define-constant tier-silver u2)
(define-constant tier-gold u3)

;; Tier thresholds, expressed in STX-equivalent microunits.
;; sBTC donations are converted to STX-equivalent via an owner-set rate
;; (see `sbtc-to-stx-numerator` / `sbtc-to-stx-denominator`).
(define-constant threshold-bronze u1000000)        ;; 1 STX
(define-constant threshold-silver u10000000)       ;; 10 STX
(define-constant threshold-gold u100000000)        ;; 100 STX

;; Fundraising contract that issues the donations we read from.
;; Hard-coded to the mainnet deployment; non-mainnet deployments remap this
;; principal in their deployment plan (see clarity/deployments/*.yaml).
(define-constant fundraising-contract 'SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.fundraising)

;; -- Asset --

(define-non-fungible-token donor-badge uint)

;; -- Storage --

(define-data-var last-token-id uint u0)

;; Templated metadata URI. Clients substitute `{id}` when resolving a
;; specific token. Pattern follows the SIP-009 / ERC-1155 convention used
;; by most NFT marketplaces.
(define-data-var token-uri (string-ascii 256) "https://fundstacks.vercel.app/api/badges/{id}.json")

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
    campaignId: uint,
    donor: principal,
  }
  uint
)

;; -- SIP-009 read-only views --

(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (id uint))
  (ok (some (var-get token-uri)))
)

(define-read-only (get-owner (id uint))
  (ok (nft-get-owner? donor-badge id))
)

;; -- FundStacks-specific views --

(define-read-only (get-badge-metadata (id uint))
  (map-get? badge-metadata id)
)

(define-read-only (get-donor-badge-id
    (campaignId uint)
    (donor principal)
  )
  (map-get? donor-badge-id {
    campaignId: campaignId,
    donor: donor,
  })
)

;; Pure tier-from-amount helper. Exposed read-only so the front-end can
;; preview the tier a donor would receive before they spend gas on
;; `claim-badge`.
(define-read-only (tier-for-amount (amount uint))
  (if (>= amount threshold-gold)
    tier-gold
    (if (>= amount threshold-silver)
      tier-silver
      (if (>= amount threshold-bronze)
        tier-bronze
        tier-none
      )
    )
  )
)
