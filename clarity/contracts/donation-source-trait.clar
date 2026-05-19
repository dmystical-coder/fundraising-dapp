;; Donation Source Trait
;;
;; Minimal read-only interface that any contract acting as a "donation
;; source" must expose. donor-badges depends on this trait so it can
;; resolve a donor's per-campaign contribution without baking in a
;; specific fundraising contract address -- keeping it testable in
;; simnet and reusable if FundStacks ever ships a v2 fundraising
;; contract.
;;
;; The live `fundraising` contract on mainnet already implements both
;; of these getter signatures, so adopting this trait is a no-op for
;; the existing deployment.

(define-trait donation-source-trait
  (
    (get-stx-donation (uint principal) (response uint uint))
    (get-sbtc-donation (uint principal) (response uint uint))
  )
)
