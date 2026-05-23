;; FundStacks Campaign Milestones
;;
;; Opt-in trust escrow for fundraising campaigns. After a creator
;; withdraws from the fundraising contract, they can lock a portion
;; of the funds in this contract against donor-approved tranches.
;; Donors vote (weighted by their original STX contribution, capped
;; per donor) to release each tranche. The creator can only claim
;; a tranche once its accumulated vote weight clears a threshold
;; the creator commits to at escrow creation.
;;
;; Flow:
;;   1. create-escrow(source, campaign-id, tranche-count, release-threshold)
;;      Creator deposits STX, split equally across 1-4 tranches.
;;   2. vote-release(source, campaign-id, tranche-id)
;;      Each donor's vote weight = min(stx-contribution, VOTE_CAP_USTX).
;;   3. claim-tranche(campaign-id, tranche-id)
;;      Creator claims a tranche once vote-weight >= release-threshold.
;;
;; The vote-weight cap blunts whale dominance while staying sybil-
;; resistant -- weight is tied to on-chain donation records on the
;; live fundraising contract via the fundstacks-source trait.

(use-trait fundstacks-source .fundstacks-source-trait.fundstacks-source)

;; -- Constants --

(define-constant CONTRACT_OWNER tx-sender)
(define-constant MAX_TRANCHE_COUNT u4)
(define-constant MIN_TRANCHE_COUNT u1)
;; Vote-weight cap. A donor's vote weight = min(stx-contribution, VOTE_CAP_USTX).
;; Default: 100 STX (100_000_000 microSTX). Blunts whale dominance while
;; tying weight to verifiable on-chain donation records.
(define-constant VOTE_CAP_USTX u100000000)

;; Errors
(define-constant ERR_NOT_AUTHORIZED (err u500))
(define-constant ERR_ESCROW_EXISTS (err u501))
(define-constant ERR_ESCROW_NOT_FOUND (err u502))
(define-constant ERR_INVALID_TRANCHE_COUNT (err u503))
(define-constant ERR_INVALID_THRESHOLD (err u504))
(define-constant ERR_INVALID_AMOUNT (err u505))
(define-constant ERR_TRANCHE_NOT_FOUND (err u506))
(define-constant ERR_NOT_A_DONOR (err u507))
(define-constant ERR_ALREADY_VOTED (err u508))
(define-constant ERR_INSUFFICIENT_VOTES (err u509))
(define-constant ERR_ALREADY_CLAIMED (err u510))
(define-constant ERR_INVALID_CAMPAIGN (err u511))
(define-constant ERR_STX_TRANSFER_FAILED (err u512))

;; -- Storage --

;; One escrow per campaign-id. The owner is captured from get-campaign-info
;; at create time and stored, so a later transfer of the campaign-owner
;; principal on the source contract cannot redirect remaining tranche
;; payouts. tranche-amount = floor(deposit / tranche-count); any
;; remainder stays in balance and is paid out with the final tranche.
(define-map escrows
  uint
  {
    owner: principal,
    balance: uint,
    tranche-count: uint,
    tranche-amount: uint,
    release-threshold: uint,
    created-at: uint,
  }
)

;; Per-tranche vote accumulation and lifecycle.
;; vote-weight: running sum of donor weights, each capped at VOTE_CAP_USTX.
;; released:    set true once vote-weight >= release-threshold at claim time.
;; claimed:     set true once the owner has pulled the tranche payout.
(define-map tranche-votes
  {
    campaign-id: uint,
    tranche-id: uint,
  }
  {
    vote-weight: uint,
    released: bool,
    claimed: bool,
  }
)

;; Anti-replay record. Set true after a donor's vote is counted.
(define-map donor-votes
  {
    campaign-id: uint,
    tranche-id: uint,
    donor: principal,
  }
  bool
)
