;; FundStacks Source Trait
;;
;; Combined trait that the live fundraising contract satisfies.
;; fundstacks-rewards uses it to read both donation amounts and campaign
;; progress from a single contract parameter, so neither value can be
;; spoofed by the caller.

(define-trait fundstacks-source
  (
    (get-stx-donation (uint principal) (response uint uint))
    (get-sbtc-donation (uint principal) (response uint uint))
    (get-campaign-info (uint) (response {
      id: uint,
      owner: principal,
      beneficiary: principal,
      startBlock: uint,
      start: uint,
      end: uint,
      createdAt: uint,
      endAt: uint,
      goal: uint,
      totalStx: uint,
      totalSbtc: uint,
      donationCount: uint,
      isExpired: bool,
      isWithdrawn: bool,
      isCancelled: bool,
    } uint))
  )
)
