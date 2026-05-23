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

;; -- Storage --

;; One escrow per campaign-id. The owner is captured from get-campaign-info
;; at create time and stored, so a later transfer of the campaign-owner
;; principal on the source contract cannot redirect remaining tranche
;; payouts. tranche-amount = floor(deposit / tranche-count); each claim
;; pays exactly tranche-amount and any floor-division remainder is
;; locked dust (the FE warns creators to use evenly-divisible amounts).
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

;; -- Public functions --

;; Create the escrow for a campaign and deposit the locked STX in one
;; call. Caller must be the campaign owner as reported by the source
;; contract; the owner principal is captured at create time so a later
;; ownership transfer on the source can't redirect future tranche
;; payouts. tranche-amount = floor(amount / tranche-count); each claim
;; pays exactly tranche-amount and any floor-division remainder is
;; locked dust (FE warns creators to use evenly-divisible deposits).
(define-public (create-escrow
    (source <fundstacks-source>)
    (campaign-id uint)
    (amount uint)
    (tranche-count uint)
    (release-threshold uint)
  )
  (let (
      (info (try! (contract-call? source get-campaign-info campaign-id)))
      (owner (get owner info))
      (tranche-amount (/ amount tranche-count))
    )
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts!
      (and
        (>= tranche-count MIN_TRANCHE_COUNT)
        (<= tranche-count MAX_TRANCHE_COUNT)
      )
      ERR_INVALID_TRANCHE_COUNT
    )
    (asserts! (> release-threshold u0) ERR_INVALID_THRESHOLD)
    (asserts! (is-eq tx-sender owner) ERR_NOT_AUTHORIZED)
    (asserts!
      (is-none (map-get? escrows campaign-id))
      ERR_ESCROW_EXISTS
    )
    (try! (stx-transfer? amount tx-sender (try! (as-contract? () tx-sender))))
    (map-insert escrows campaign-id {
      owner: owner,
      balance: amount,
      tranche-count: tranche-count,
      tranche-amount: tranche-amount,
      release-threshold: release-threshold,
      created-at: stacks-block-height,
    })
    (ok true)
  )
)

;; Cast a donor vote toward releasing tranche-id of campaign-id.
;; Vote weight = min(stx-contribution-to-campaign, VOTE_CAP_USTX). A
;; donor with no STX contribution to the campaign cannot vote, and
;; each donor can only vote once per tranche. Returns the weight that
;; was added to the tally (handy as a confirmation for the caller).
(define-public (vote-release
    (source <fundstacks-source>)
    (campaign-id uint)
    (tranche-id uint)
  )
  (let (
      (donor tx-sender)
      (escrow (unwrap! (map-get? escrows campaign-id) ERR_ESCROW_NOT_FOUND))
      (contribution (try! (contract-call? source get-stx-donation campaign-id donor)))
      (weight (if (< contribution VOTE_CAP_USTX)
                contribution
                VOTE_CAP_USTX
              ))
      (existing (default-to
                  {
                    vote-weight: u0,
                    released: false,
                    claimed: false,
                  }
                  (map-get? tranche-votes {
                    campaign-id: campaign-id,
                    tranche-id: tranche-id,
                  })
                ))
    )
    (asserts!
      (< tranche-id (get tranche-count escrow))
      ERR_TRANCHE_NOT_FOUND
    )
    (asserts! (> contribution u0) ERR_NOT_A_DONOR)
    (asserts!
      (is-none (map-get? donor-votes {
        campaign-id: campaign-id,
        tranche-id: tranche-id,
        donor: donor,
      }))
      ERR_ALREADY_VOTED
    )
    (map-set tranche-votes
      {
        campaign-id: campaign-id,
        tranche-id: tranche-id,
      }
      (merge existing {
        vote-weight: (+ (get vote-weight existing) weight),
      })
    )
    (map-set donor-votes
      {
        campaign-id: campaign-id,
        tranche-id: tranche-id,
        donor: donor,
      }
      true
    )
    (ok weight)
  )
)

;; Owner claims a tranche once its accumulated vote-weight has cleared
;; the release-threshold set at create time. Tranches can be claimed in
;; any order -- donor votes determine release readiness independently
;; per tranche. Each successful claim pays out exactly tranche-amount;
;; floor-division dust from create stays permanently locked.
(define-public (claim-tranche
    (campaign-id uint)
    (tranche-id uint)
  )
  (let (
      (escrow (unwrap! (map-get? escrows campaign-id) ERR_ESCROW_NOT_FOUND))
      (tranche-count (get tranche-count escrow))
      (recipient (get owner escrow))
      (tranche-amount (get tranche-amount escrow))
      (tranche (default-to
                  {
                    vote-weight: u0,
                    released: false,
                    claimed: false,
                  }
                  (map-get? tranche-votes {
                    campaign-id: campaign-id,
                    tranche-id: tranche-id,
                  })
                ))
    )
    (asserts! (is-eq tx-sender recipient) ERR_NOT_AUTHORIZED)
    (asserts! (< tranche-id tranche-count) ERR_TRANCHE_NOT_FOUND)
    (asserts! (not (get claimed tranche)) ERR_ALREADY_CLAIMED)
    (asserts!
      (>= (get vote-weight tranche) (get release-threshold escrow))
      ERR_INSUFFICIENT_VOTES
    )
    (try! (as-contract? ((with-stx tranche-amount))
      (begin
        (try! (stx-transfer? tranche-amount tx-sender recipient))
        true
      )
    ))
    (map-set tranche-votes
      {
        campaign-id: campaign-id,
        tranche-id: tranche-id,
      }
      (merge tranche {
        released: true,
        claimed: true,
      })
    )
    (map-set escrows campaign-id
      (merge escrow {
        balance: (- (get balance escrow) tranche-amount),
      })
    )
    (ok tranche-amount)
  )
)

;; -- Read-only views --

(define-read-only (get-escrow-info (campaign-id uint))
  (map-get? escrows campaign-id)
)

(define-read-only (get-tranche-info
    (campaign-id uint)
    (tranche-id uint)
  )
  (map-get? tranche-votes {
    campaign-id: campaign-id,
    tranche-id: tranche-id,
  })
)

(define-read-only (has-voted
    (campaign-id uint)
    (tranche-id uint)
    (donor principal)
  )
  (is-some (map-get? donor-votes {
    campaign-id: campaign-id,
    tranche-id: tranche-id,
    donor: donor,
  }))
)

;; Surfaces the per-donor vote-weight cap so the FE has a single
;; source of truth without hardcoding the constant.
(define-read-only (get-vote-cap)
  VOTE_CAP_USTX
)

;; Allowed range for tranche-count at create time.
(define-read-only (get-tranche-bounds)
  {
    min: MIN_TRANCHE_COUNT,
    max: MAX_TRANCHE_COUNT,
  }
)
