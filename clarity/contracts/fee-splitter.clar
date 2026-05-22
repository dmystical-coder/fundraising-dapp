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
;; fee          = amount × fee-bps / 10000
;; charity-cut  = fee × charity-share-bps / 10000
;; protocol-cut = fee − charity-cut

(use-trait fundstacks-source .fundstacks-source-trait.fundstacks-source)

;; -- Constants --

(define-constant CONTRACT_OWNER tx-sender)
(define-constant SBTC_TOKEN 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)
(define-constant MAX_FEE_BPS u1000) ;; 10% hard cap — prevents owner from setting a ruinous fee

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
