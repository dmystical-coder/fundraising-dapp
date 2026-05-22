;; Fundraising Campaign Contract
;; A fundraising platform contract to accept crypto donations in STX or sBTC.
;; Supports multiple campaigns identified by a campaign-id.

;; Constants
;; NOTE: `contract-owner` is the deployer and is intended only for platform-level admin.
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_CAMPAIGN_ENDED (err u101))
(define-constant ERR_NOT_CANCELLED (err u103))
(define-constant ERR_CAMPAIGN_NOT_ENDED (err u104))
(define-constant ERR_CAMPAIGN_CANCELLED (err u105))
(define-constant ERR_ALREADY_WITHDRAWN (err u107))
(define-constant ERR_INVALID_AMOUNT (err u108))
(define-constant ERR_CAMPAIGN_NOT_FOUND (err u109))
(define-constant ERR_INVALID_END_AT (err u110))

;; sBTC token contract (static identifier required by Clarity for contract-call?)
(define-constant SBTC_TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; Default campaign duration in seconds (30 days).
(define-constant DEFAULT_DURATION_SECS u2592000)

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
    createdAt: uint,
    endAt: uint,
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
    campaign-id: uint,
    donor: principal,
  }
  uint
)
;; (campaign-id, donor) -> amount

(define-map sbtc-donations
  {
    campaign-id: uint,
    donor: principal,
  }
  uint
)
;; (campaign-id, donor) -> amount

;; Create a new campaign.
;; goal is informational (e.g. USD in UI).
;; end-at is an absolute timestamp in seconds (same basis as stacks-block-time).
;; Pass u0 to use default duration (30 days).
(define-public (create-campaign
    (goal uint)
    (end-at uint)
    (beneficiary principal)
  )
  (let (
      (campaign-id (+ (var-get last-campaign-id) u1))
      (start-at stacks-block-time)
      (actual-end-at (if (is-eq end-at u0)
        (+ stacks-block-time DEFAULT_DURATION_SECS)
        end-at
      ))
    )
    (asserts! (> goal u0) ERR_INVALID_AMOUNT)
    (asserts! (> actual-end-at start-at) ERR_INVALID_END_AT)
    (var-set last-campaign-id campaign-id)
    (map-set campaigns campaign-id {
      owner: tx-sender,
      beneficiary: beneficiary,
      goal: goal,
      start: burn-block-height,
      createdAt: start-at,
      endAt: actual-end-at,
      duration: (- actual-end-at start-at),
      totalStx: u0,
      totalSbtc: u0,
      donationCount: u0,
      isCancelled: false,
      isWithdrawn: false,
    })
    (print {
      event: "campaign-created",
      campaignId: campaign-id,
      owner: tx-sender,
      beneficiary: beneficiary,
      goal: goal,
    })
    (ok campaign-id)
  )
)

;; Cancel a campaign.
;; Only the campaign owner can call this, if not withdrawn.
(define-public (cancel-campaign (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND)))
    (begin
      (asserts! (is-eq tx-sender (get owner campaign)) ERR_NOT_AUTHORIZED)
      (asserts! (not (get isWithdrawn campaign)) ERR_ALREADY_WITHDRAWN)
      (map-set campaigns campaign-id (merge campaign { isCancelled: true }))
      (print {
        event: "campaign-cancelled",
        campaignId: campaign-id,
      })
      (ok true)
    )
  )
)

;; Donate STX. Pass amount in microstacks.
(define-public (donate-stx
    (campaign-id uint)
    (amount uint)
  )
  (let (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND))
      (end (get endAt campaign))
      (donation-key {
        campaign-id: campaign-id,
        donor: tx-sender,
      })
    )
    (begin
      (asserts! (> amount u0) ERR_INVALID_AMOUNT)
      (asserts! (not (get isCancelled campaign)) ERR_CAMPAIGN_CANCELLED)
      (asserts! (< stacks-block-time end) ERR_CAMPAIGN_ENDED)
      (try! (stx-transfer? amount tx-sender (try! (as-contract? () tx-sender))))
      (map-set stx-donations donation-key
        (+ (default-to u0 (map-get? stx-donations donation-key)) amount)
      )
      (map-set campaigns campaign-id
        (merge campaign {
          totalStx: (+ (get totalStx campaign) amount),
          donationCount: (+ (get donationCount campaign) u1),
        })
      )
      (print {
        event: "donated-stx",
        campaignId: campaign-id,
        donor: tx-sender,
        amount: amount,
      })
      (ok true)
    )
  )
)

;; Donate sBTC. Pass amount in Satoshis.
(define-public (donate-sbtc
    (campaign-id uint)
    (amount uint)
  )
  (let (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND))
      (end (get endAt campaign))
      (donation-key {
        campaign-id: campaign-id,
        donor: tx-sender,
      })
    )
    (begin
      (asserts! (> amount u0) ERR_INVALID_AMOUNT)
      (asserts! (not (get isCancelled campaign)) ERR_CAMPAIGN_CANCELLED)
      (asserts! (< stacks-block-time end) ERR_CAMPAIGN_ENDED)
      (try! (contract-call? SBTC_TOKEN transfer amount tx-sender
        (try! (as-contract? () tx-sender)) none
      ))
      (map-set sbtc-donations donation-key
        (+ (default-to u0 (map-get? sbtc-donations donation-key)) amount)
      )
      (map-set campaigns campaign-id
        (merge campaign {
          totalSbtc: (+ (get totalSbtc campaign) amount),
          donationCount: (+ (get donationCount campaign) u1),
        })
      )
      (print {
        event: "donated-sbtc",
        campaignId: campaign-id,
        donor: tx-sender,
        amount: amount,
      })
      (ok true)
    )
  )
)

;; Withdraw funds for a campaign (only beneficiary, only if campaign is ended)
(define-public (withdraw (campaign-id uint))
  (let (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND))
      (end (get endAt campaign))
      (total-stx-amount (get totalStx campaign))
      (total-sbtc-amount (get totalSbtc campaign))
      (beneficiary (get beneficiary campaign))
    )
    (begin
      (asserts! (not (get isCancelled campaign)) ERR_CAMPAIGN_CANCELLED)
      (asserts! (not (get isWithdrawn campaign)) ERR_ALREADY_WITHDRAWN)
      (asserts! (is-eq tx-sender beneficiary) ERR_NOT_AUTHORIZED)
      (asserts! (>= stacks-block-time end) ERR_CAMPAIGN_NOT_ENDED)
      (try! (as-contract?
        ((with-stx total-stx-amount) (with-ft SBTC_TOKEN "*" total-sbtc-amount))
        (begin
          (if (> total-stx-amount u0)
            (try! (stx-transfer? total-stx-amount tx-sender beneficiary))
            true
          )
          (if (> total-sbtc-amount u0)
            (try! (contract-call? SBTC_TOKEN transfer total-sbtc-amount tx-sender
              beneficiary none
            ))
            true
          )
          true
        )))
      (map-set campaigns campaign-id
        (merge campaign {
          isWithdrawn: true,
          totalStx: u0,
          totalSbtc: u0,
        })
      )
      (print {
        event: "campaign-withdrawn",
        campaignId: campaign-id,
      })
      (ok true)
    )
  )
)

;; Refund to donor for a cancelled campaign.
(define-public (refund (campaign-id uint))
  (let (
      (campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND))
      (donation-key {
        campaign-id: campaign-id,
        donor: tx-sender,
      })
      (stx-amount (default-to u0 (map-get? stx-donations donation-key)))
      (sbtc-amount (default-to u0 (map-get? sbtc-donations donation-key)))
      (contributor tx-sender)
    )
    (begin
      (asserts! (get isCancelled campaign) ERR_NOT_CANCELLED)
      (if (> stx-amount u0)
        (try! (as-contract? ((with-stx stx-amount))
          (begin
            (try! (stx-transfer? stx-amount tx-sender contributor))
            true
          )))
        true
      )
      (if (> sbtc-amount u0)
        (try! (as-contract? ((with-ft SBTC_TOKEN "*" sbtc-amount))
          (begin
            (try! (contract-call? SBTC_TOKEN transfer sbtc-amount tx-sender contributor
              none
            ))
            true
          )))
        true
      )
      (map-delete stx-donations donation-key)
      (map-delete sbtc-donations donation-key)
      (map-set campaigns campaign-id
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
        campaignId: campaign-id,
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
    (campaign-id uint)
    (donor principal)
  )
  (ok (default-to u0
    (map-get? stx-donations {
      campaign-id: campaign-id,
      donor: donor,
    })
  ))
)

(define-read-only (get-sbtc-donation
    (campaign-id uint)
    (donor principal)
  )
  (ok (default-to u0
    (map-get? sbtc-donations {
      campaign-id: campaign-id,
      donor: donor,
    })
  ))
)

(define-read-only (get-campaign-info (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND)))
    (ok {
      id: campaign-id,
      owner: (get owner campaign),
      beneficiary: (get beneficiary campaign),
      startBlock: (get start campaign),
      start: (get createdAt campaign),
      end: (get endAt campaign),
      createdAt: (get createdAt campaign),
      endAt: (get endAt campaign),
      goal: (get goal campaign),
      totalStx: (get totalStx campaign),
      totalSbtc: (get totalSbtc campaign),
      donationCount: (get donationCount campaign),
      isExpired: (>= stacks-block-time (get endAt campaign)),
      isWithdrawn: (get isWithdrawn campaign),
      isCancelled: (get isCancelled campaign),
    })
  )
)

;; Clarity 4 helpers
(define-read-only (get-current-stacks-block-time)
  (ok stacks-block-time)
)

(define-read-only (get-campaign-created-at (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND)))
    (ok (get createdAt campaign))
  )
)

(define-read-only (get-campaign-end-at (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) ERR_CAMPAIGN_NOT_FOUND)))
    (ok (get endAt campaign))
  )
)

(define-read-only (principal-to-ascii (p principal))
  (to-ascii? p)
)

(define-read-only (get-sbtc-token-contract)
  (ok SBTC_TOKEN)
)

(define-read-only (get-contract-balance)
  (match (as-contract? () tx-sender)
    contract-principal (stx-get-balance contract-principal)
    err u0
  )
)
