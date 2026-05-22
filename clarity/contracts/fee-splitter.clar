;; FundStacks Fee Splitter
;;
;; Collects a configurable platform fee (default 1%) when donors call
;; pay-fee-stx or pay-fee-sbtc alongside their fundraising.donate-*
;; call. The fee is split between the protocol treasury and an optional
;; per-campaign charity address configured by the campaign owner.
;;
;; Typical two-call donate flow (FE bundles both):
;;   1. fee-splitter.pay-fee-stx(campaign-id, amount)
;;   2. fundraising.donate-stx(campaign-id, amount)
;;
;; fee          = amount * fee-bps / 10000
;; charity-cut  = fee * charity-share-bps / 10000
;; protocol-cut = fee - charity-cut

(use-trait fundstacks-source .fundstacks-source-trait.fundstacks-source)

;; -- Constants --

(define-constant CONTRACT_OWNER tx-sender)
(define-constant SBTC_TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)
(define-constant MAX_FEE_BPS u1000) ;; 10% hard cap

;; Errors
(define-constant ERR_NOT_AUTHORIZED (err u400))
(define-constant ERR_INVALID_FEE (err u401))
(define-constant ERR_INVALID_SPLIT (err u402))
(define-constant ERR_INVALID_AMOUNT (err u403))
(define-constant ERR_NO_FEES (err u404))

;; -- Data vars --

(define-data-var fee-bps uint u100) ;; default 1%
(define-data-var protocol-treasury principal CONTRACT_OWNER)

;; -- Storage --

;; Optional per-campaign charity split, set by the campaign owner.
;; share-bps is the charity's portion of the fee (out of 10000).
(define-map campaign-charity
  uint
  {
    charity: principal,
    share-bps: uint,
  }
)

;; Accumulated fees per principal. Recipients pull via withdraw-fees.
(define-map pending-stx principal uint)
(define-map pending-sbtc principal uint)

;; -- Public functions --

;; Pay the platform fee for an STX donation. Call this alongside
;; fundraising.donate-stx in the same transaction batch.
(define-public (pay-fee-stx
    (campaign-id uint)
    (amount uint)
  )
  (let (
      (fee (/ (* amount (var-get fee-bps)) u10000))
    )
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> fee u0) ERR_INVALID_FEE)
    (try! (stx-transfer? fee tx-sender (try! (as-contract? () tx-sender))))
    (credit-stx campaign-id fee)
  )
)

;; Pay the platform fee for an sBTC donation. Call this alongside
;; fundraising.donate-sbtc in the same transaction batch.
(define-public (pay-fee-sbtc
    (campaign-id uint)
    (amount uint)
  )
  (let (
      (fee (/ (* amount (var-get fee-bps)) u10000))
    )
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> fee u0) ERR_INVALID_FEE)
    (try! (contract-call? SBTC_TOKEN transfer fee tx-sender
      (try! (as-contract? () tx-sender)) none
    ))
    (credit-sbtc campaign-id fee)
  )
)

;; Withdraw all accumulated fees for the caller. Sends any pending STX
;; and sBTC in a single call.
(define-public (withdraw-fees)
  (let (
      (recipient tx-sender)
      (stx-amount (default-to u0 (map-get? pending-stx recipient)))
      (sbtc-amount (default-to u0 (map-get? pending-sbtc recipient)))
    )
    (asserts! (or (> stx-amount u0) (> sbtc-amount u0)) ERR_NO_FEES)
    (map-delete pending-stx recipient)
    (map-delete pending-sbtc recipient)
    (try! (as-contract?
      ((with-stx stx-amount) (with-ft SBTC_TOKEN "*" sbtc-amount))
      (begin
        (if (> stx-amount u0)
          (try! (stx-transfer? stx-amount tx-sender recipient))
          true
        )
        (if (> sbtc-amount u0)
          (try! (contract-call? SBTC_TOKEN transfer sbtc-amount tx-sender recipient none))
          true
        )
        true
      )
    ))
    (print {
      event: "fees-withdrawn",
      recipient: recipient,
      stx: stx-amount,
      sbtc: sbtc-amount,
    })
    (ok { stx: stx-amount, sbtc: sbtc-amount })
  )
)

;; Set a charity split for a campaign. Only the campaign owner may call
;; this. share-bps is the charity's cut of the fee, out of 10000.
(define-public (set-campaign-charity
    (source <fundstacks-source>)
    (campaign-id uint)
    (charity principal)
    (share-bps uint)
  )
  (let (
      (info (try! (contract-call? source get-campaign-info campaign-id)))
    )
    (asserts! (is-eq tx-sender (get owner info)) ERR_NOT_AUTHORIZED)
    (asserts! (<= share-bps u10000) ERR_INVALID_SPLIT)
    (map-set campaign-charity campaign-id { charity: charity, share-bps: share-bps })
    (print {
      event: "campaign-charity-set",
      campaign-id: campaign-id,
      charity: charity,
      share-bps: share-bps,
    })
    (ok true)
  )
)

;; -- Read-only views --

(define-read-only (get-fee-bps)
  (ok (var-get fee-bps))
)

(define-read-only (get-protocol-treasury)
  (ok (var-get protocol-treasury))
)

(define-read-only (get-campaign-charity (campaign-id uint))
  (ok (map-get? campaign-charity campaign-id))
)

(define-read-only (get-pending-stx (who principal))
  (ok (default-to u0 (map-get? pending-stx who)))
)

(define-read-only (get-pending-sbtc (who principal))
  (ok (default-to u0 (map-get? pending-sbtc who)))
)

;; Preview the fee for a given donation amount at the current fee-bps.
(define-read-only (compute-fee (amount uint))
  (ok (/ (* amount (var-get fee-bps)) u10000))
)

;; -- Admin --

(define-public (set-fee-bps (bps uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (<= bps MAX_FEE_BPS) ERR_INVALID_FEE)
    (var-set fee-bps bps)
    (print { event: "fee-bps-updated", bps: bps })
    (ok true)
  )
)

(define-public (set-protocol-treasury (who principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (var-set protocol-treasury who)
    (print { event: "treasury-updated", treasury: who })
    (ok true)
  )
)

;; -- Private helpers --

(define-private (credit-stx (campaign-id uint) (fee uint))
  (let (
      (treasury (var-get protocol-treasury))
      (config (map-get? campaign-charity campaign-id))
      (charity-cut (match config cfg (/ (* fee (get share-bps cfg)) u10000) u0))
      (protocol-cut (- fee charity-cut))
    )
    (map-set pending-stx treasury
      (+ (default-to u0 (map-get? pending-stx treasury)) protocol-cut)
    )
    (match config
      cfg (map-set pending-stx (get charity cfg)
            (+ (default-to u0 (map-get? pending-stx (get charity cfg))) charity-cut)
          )
      false
    )
    (print {
      event: "fee-paid-stx",
      campaign-id: campaign-id,
      fee: fee,
      protocol-cut: protocol-cut,
      charity-cut: charity-cut,
    })
    (ok fee)
  )
)

(define-private (credit-sbtc (campaign-id uint) (fee uint))
  (let (
      (treasury (var-get protocol-treasury))
      (config (map-get? campaign-charity campaign-id))
      (charity-cut (match config cfg (/ (* fee (get share-bps cfg)) u10000) u0))
      (protocol-cut (- fee charity-cut))
    )
    (map-set pending-sbtc treasury
      (+ (default-to u0 (map-get? pending-sbtc treasury)) protocol-cut)
    )
    (match config
      cfg (map-set pending-sbtc (get charity cfg)
            (+ (default-to u0 (map-get? pending-sbtc (get charity cfg))) charity-cut)
          )
      false
    )
    (print {
      event: "fee-paid-sbtc",
      campaign-id: campaign-id,
      fee: fee,
      protocol-cut: protocol-cut,
      charity-cut: charity-cut,
    })
    (ok fee)
  )
)
