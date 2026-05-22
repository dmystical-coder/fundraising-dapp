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
