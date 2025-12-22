;; Fundraising Campaign Contract
;; A fundraising platform contract to accept crypto donations in STX or sBTC.
;; Supports multiple campaigns identified by a campaign-id.

;; Constants
;; NOTE: `contract-owner` is the deployer and is intended only for platform-level admin.
(define-constant contract-owner tx-sender)

(define-constant err-not-authorized (err u100))
(define-constant err-campaign-ended (err u101))
(define-constant err-not-initialized (err u102))
(define-constant err-not-cancelled (err u103))
(define-constant err-campaign-not-ended (err u104))
(define-constant err-campaign-cancelled (err u105))
(define-constant err-already-initialized (err u106))
(define-constant err-already-withdrawn (err u107))
(define-constant err-invalid-amount (err u108))
(define-constant err-campaign-not-found (err u109))

;; sBTC token contract (static identifier required by Clarity for contract-call?)
(define-constant sbtc-token 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

(define-constant default-duration u4320) ;; Duration in *Bitcoin* blocks. This default value means is if a block is 10 minutes, this is roughly 30 days.

;; Data vars
(define-data-var last-campaign-id uint u0)

;; Maps
(define-map campaigns
  uint
    {
    owner: principal,
    beneficiary: principal,
    goal: uint,
    start: uint,
    duration: uint,
    totalStx: uint,
    totalSbtc: uint,
    donationCount: uint,
    isCancelled: bool,
    isWithdrawn: bool,
  }
)

(define-map stx-donations
    {
    campaignId: uint,
    donor: principal,
  }
  uint
)
;; (campaignId, donor) -> amount

(define-map sbtc-donations
    {
    campaignId: uint,
    donor: principal,
  }
  uint
)
;; (campaignId, donor) -> amount

;; Create a new campaign.
;; goal is informational (e.g. USD in UI). duration is in BTC blocks (0 => default).
(define-public (create-campaign
    (goal uint)
    (duration uint)
    (beneficiary principal)
  )
  (let (
      (campaignId (+ (var-get last-campaign-id) u1))
      (actual-duration (if (is-eq duration u0)
        default-duration
        duration
      ))
    )
    (asserts! (> goal u0) err-invalid-amount)
    (var-set last-campaign-id campaignId)
    (map-set campaigns campaignId {
      owner: tx-sender,
      beneficiary: beneficiary,
      goal: goal,
      start: burn-block-height,
      duration: actual-duration,
      totalStx: u0,
      totalSbtc: u0,
      donationCount: u0,
      isCancelled: false,
      isWithdrawn: false,
    })
    (print {
      event: "campaign-created",
      campaignId: campaignId,
      owner: tx-sender,
      beneficiary: beneficiary,
      goal: goal,
    })
    (ok campaignId)
  )
)

;; Cancel a campaign.
;; Only the campaign owner can call this, if not withdrawn.
(define-public (cancel-campaign (campaignId uint))
  (let ((campaign (unwrap! (map-get? campaigns campaignId) err-campaign-not-found)))
    (begin
      (asserts! (is-eq tx-sender (get owner campaign)) err-not-authorized)
      (asserts! (not (get isWithdrawn campaign)) err-already-withdrawn)
      (map-set campaigns campaignId (merge campaign { isCancelled: true }))
      (print {
        event: "campaign-cancelled",
        campaignId: campaignId,
      })
      (ok true)
    )
  )
)

;; Donate STX. Pass amount in microstacks.
(define-public (donate-stx
    (campaignId uint)
    (amount uint)
  )
  (let (
      (campaign (unwrap! (map-get? campaigns campaignId) err-campaign-not-found))
      (end (+ (get start campaign) (get duration campaign)))
      (donationKey {
        campaignId: campaignId,
        donor: tx-sender,
      })
    )
    (begin
      (asserts! (> amount u0) err-invalid-amount)
      (asserts! (not (get isCancelled campaign)) err-campaign-cancelled)
      (asserts! (< burn-block-height end) err-campaign-ended)
      (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
      (map-set stx-donations donationKey
        (+ (default-to u0 (map-get? stx-donations donationKey)) amount)
      )
      (map-set campaigns campaignId
        (merge campaign {
          totalStx: (+ (get totalStx campaign) amount),
          donationCount: (+ (get donationCount campaign) u1),
        })
      )
      (print {
        event: "donated-stx",
        campaignId: campaignId,
        donor: tx-sender,
        amount: amount,
      })
      (ok true)
    )
  )
)

;; Donate sBTC. Pass amount in Satoshis.
(define-public (donate-sbtc
    (campaignId uint)
    (amount uint)
  )
  (let (
      (campaign (unwrap! (map-get? campaigns campaignId) err-campaign-not-found))
      (end (+ (get start campaign) (get duration campaign)))
      (donationKey {
        campaignId: campaignId,
        donor: tx-sender,
      })
    )
    (begin
      (asserts! (> amount u0) err-invalid-amount)
      (asserts! (not (get isCancelled campaign)) err-campaign-cancelled)
      (asserts! (< burn-block-height end) err-campaign-ended)
      (try! (contract-call? sbtc-token transfer amount contract-caller
        (as-contract tx-sender) none
      ))
      (map-set sbtc-donations donationKey
        (+ (default-to u0 (map-get? sbtc-donations donationKey)) amount)
      )
      (map-set campaigns campaignId
        (merge campaign {
          totalSbtc: (+ (get totalSbtc campaign) amount),
          donationCount: (+ (get donationCount campaign) u1),
        })
      )
      (print {
        event: "donated-sbtc",
        campaignId: campaignId,
        donor: tx-sender,
        amount: amount,
      })
      (ok true)
    )
  )
)

;; Withdraw funds for a campaign (only beneficiary, only if campaign is ended)
(define-public (withdraw (campaignId uint))
  (let (
      (campaign (unwrap! (map-get? campaigns campaignId) err-campaign-not-found))
      (end (+ (get start campaign) (get duration campaign)))
      (total-stx-amount (get totalStx campaign))
      (total-sbtc-amount (get totalSbtc campaign))
      (beneficiary (get beneficiary campaign))
    )
    (begin
      (asserts! (not (get isCancelled campaign)) err-campaign-cancelled)
      (asserts! (not (get isWithdrawn campaign)) err-already-withdrawn)
      (asserts! (is-eq tx-sender beneficiary) err-not-authorized)
      (asserts! (>= burn-block-height end) err-campaign-not-ended)
      (as-contract (begin
        (if (> total-stx-amount u0)
          (try! (stx-transfer? total-stx-amount (as-contract tx-sender) beneficiary))
          true
        )
        (if (> total-sbtc-amount u0)
          (try! (contract-call? sbtc-token transfer total-sbtc-amount
            (as-contract tx-sender) beneficiary none
          ))
          true
        )
        (map-set campaigns campaignId
          (merge campaign {
            isWithdrawn: true,
            totalStx: u0,
            totalSbtc: u0,
          })
        )
        (print {
          event: "campaign-withdrawn",
          campaignId: campaignId,
        })
        (ok true)
      ))
    )
  )
)

;; Refund to donor for a cancelled campaign.
(define-public (refund (campaignId uint))
  (let (
      (campaign (unwrap! (map-get? campaigns campaignId) err-campaign-not-found))
      (donationKey {
        campaignId: campaignId,
        donor: tx-sender,
      })
      (stx-amount (default-to u0 (map-get? stx-donations donationKey)))
      (sbtc-amount (default-to u0 (map-get? sbtc-donations donationKey)))
      (contributor tx-sender)
    )
    (begin
      (asserts! (get isCancelled campaign) err-not-cancelled)
      (if (> stx-amount u0)
        (as-contract (try! (stx-transfer? stx-amount tx-sender contributor)))
        true
      )
      (if (> sbtc-amount u0)
        (as-contract (try! (contract-call? sbtc-token transfer sbtc-amount tx-sender contributor
          none
        )))
        true
      )
      (map-delete stx-donations donationKey)
      (map-delete sbtc-donations donationKey)
      (map-set campaigns campaignId
        (merge campaign {
          totalStx: (if (>= (get totalStx campaign) stx-amount)
            (- (get totalStx campaign) stx-amount)
            u0
          ),
          totalSbtc: (if (>= (get totalSbtc campaign) sbtc-amount)
            (- (get totalSbtc campaign) sbtc-amount)
            u0
          ),
        })
      )
      (print {
        event: "refunded",
        campaignId: campaignId,
        donor: contributor,
      })
      (ok true)
    )
  )
)

;; Getter functions
(define-read-only (get-last-campaign-id)
  (ok (var-get last-campaign-id))
)

(define-read-only (get-stx-donation
    (campaignId uint)
    (donor principal)
  )
  (ok (default-to u0
    (map-get? stx-donations {
      campaignId: campaignId,
      donor: donor,
    })
  ))
)

(define-read-only (get-sbtc-donation
    (campaignId uint)
    (donor principal)
  )
  (ok (default-to u0
    (map-get? sbtc-donations {
      campaignId: campaignId,
      donor: donor,
    })
  ))
)

(define-read-only (get-campaign-info (campaignId uint))
  (let ((campaign (unwrap! (map-get? campaigns campaignId) err-campaign-not-found)))
    (ok {
      id: campaignId,
      owner: (get owner campaign),
      beneficiary: (get beneficiary campaign),
      start: (get start campaign),
      end: (+ (get start campaign) (get duration campaign)),
      goal: (get goal campaign),
      totalStx: (get totalStx campaign),
      totalSbtc: (get totalSbtc campaign),
      donationCount: (get donationCount campaign),
      isExpired: (>= burn-block-height (+ (get start campaign) (get duration campaign))),
      isWithdrawn: (get isWithdrawn campaign),
      isCancelled: (get isCancelled campaign),
    })
  )
)

(define-read-only (get-contract-balance)
  (stx-get-balance (as-contract tx-sender))
)
