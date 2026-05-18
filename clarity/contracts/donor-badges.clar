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
