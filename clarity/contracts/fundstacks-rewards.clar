;; FundStacks Rewards -- SIP-010 reward token for FundStacks donors.
;;
;; Donors call `earn-rewards` after contributing to a campaign.
;; The contract computes how many FSTR tokens to mint based on:
;;   1. The donor's STX-equivalent contribution to the campaign.
;;   2. The campaign's funding progress at the time of calling.
;;
;; Issuance curve: early supporters of underfunded campaigns earn
;; more tokens per STX than donors who arrive once the goal is nearly
;; met. This creates an on-chain incentive to fund campaigns early.
;;
;;   rate = min-rate + rate-spread * (100 - progress%) / 100
;;        where progress% = min(totalStx * 100 / goal, 100)
;;
;;   At   0% funded: 10 FSTR per 1 STX donated  (rate = 10000)
;;   At  50% funded: ~5.5 FSTR per 1 STX donated
;;   At 100% funded:  1 FSTR per 1 STX donated  (rate = 1000)
;;
;; Rate arithmetic uses an internal scale of 1000 to preserve one
;; decimal place of precision: tokens = contribution_ustx * rate / 1000.

(use-trait fundstacks-source .fundstacks-source-trait.fundstacks-source)

;; -- Constants --

(define-constant contract-owner tx-sender)

;; Errors
(define-constant err-not-authorized (err u300))
(define-constant err-no-contribution (err u301))
(define-constant err-already-claimed (err u302))
(define-constant err-invalid-campaign (err u303))
(define-constant err-invalid-rate (err u304))

;; Issuance curve.
;; rate (scaled) = rate-min + rate-spread * (100 - progress%) / 100
;; tokens = contribution_ustx * rate / rate-scale
(define-constant rate-scale u1000)
(define-constant rate-min u1000)    ;; 1 FSTR per STX at 100% progress
(define-constant rate-max u10000)   ;; 10 FSTR per STX at 0% progress
(define-constant rate-spread u9000) ;; rate-max - rate-min

;; sBTC -> STX-equivalent conversion rate. Stored as a rational so the
;; owner can track sBTC/STX market moves without redeploying.
;; Default 100/1: 1 satoshi counts as 100 microSTX.
(define-data-var sbtc-to-stx-numerator uint u100)
(define-data-var sbtc-to-stx-denominator uint u1)

;; -- Asset --

(define-fungible-token fstr-token)

;; -- Storage --

(define-data-var token-uri (string-utf8 256) u"https://fundstacks.vercel.app/api/rewards/token.json")

;; (campaignId, donor) -> claimed? Guards against double-claiming.
(define-map rewards-claimed
  { campaignId: uint, donor: principal }
  bool
)

;; -- SIP-010 interface --

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (is-eq tx-sender sender) err-not-authorized)
    (try! (ft-transfer? fstr-token amount sender recipient))
    (match memo m (begin (print m) true) true)
    (ok true)
  )
)

(define-read-only (get-name) (ok "FundStacks Rewards"))
(define-read-only (get-symbol) (ok "FSTR"))
(define-read-only (get-decimals) (ok u6))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance fstr-token who)))
(define-read-only (get-total-supply) (ok (ft-get-supply fstr-token)))
(define-read-only (get-token-uri) (ok (some (var-get token-uri))))

;; -- FundStacks-specific read-only views --

;; Returns whether `donor` has already claimed rewards for `campaignId`.
(define-read-only (has-claimed (campaignId uint) (donor principal))
  (default-to false (map-get? rewards-claimed { campaignId: campaignId, donor: donor }))
)

;; Compute how many FSTR tokens a contribution earns at a given campaign
;; snapshot, without minting. Front-end can call this off-chain to
;; preview the reward before the donor submits the transaction.
(define-read-only (preview-rewards
    (contributionStxEq uint)
    (campaignGoal uint)
    (campaignTotalStx uint)
  )
  (ok (compute-tokens contributionStxEq campaignGoal campaignTotalStx))
)

;; -- Public functions --

;; Mint FSTR rewards for the caller's donation to `campaignId`.
;;
;; `source` must be the fundraising contract (or any contract satisfying
;; fundstacks-source-trait). Donation amounts and campaign state are read
;; on-chain so neither can be spoofed. Rewards for a given
;; (campaign, donor) pair can only be claimed once.
(define-public (earn-rewards
    (source <fundstacks-source>)
    (campaignId uint)
  )
  (let (
      (donor tx-sender)
      (stx-amount (try! (contract-call? source get-stx-donation campaignId donor)))
      (sbtc-amount (try! (contract-call? source get-sbtc-donation campaignId donor)))
      (num (var-get sbtc-to-stx-numerator))
      (den (var-get sbtc-to-stx-denominator))
      (contribution-stx-eq (+ stx-amount (/ (* sbtc-amount num) den)))
      (info (try! (contract-call? source get-campaign-info campaignId)))
      (goal (get goal info))
      (total-stx (get totalStx info))
      (tokens (compute-tokens contribution-stx-eq goal total-stx))
    )
    (asserts! (> contribution-stx-eq u0) err-no-contribution)
    (asserts! (> goal u0) err-invalid-campaign)
    (asserts!
      (not (default-to false (map-get? rewards-claimed { campaignId: campaignId, donor: donor })))
      err-already-claimed
    )
    (map-set rewards-claimed { campaignId: campaignId, donor: donor } true)
    (try! (ft-mint? fstr-token tokens donor))
    (print {
      event: "rewards-earned",
      campaignId: campaignId,
      donor: donor,
      tokens: tokens,
      contributionStxEq: contribution-stx-eq,
    })
    (ok tokens)
  )
)

;; -- Private helpers --

;; Issuance curve: tokens = contribution * rate / rate-scale.
;; progress is capped at 100 so overfunded campaigns pay out at min-rate.
(define-private (compute-tokens
    (contribution-stx-eq uint)
    (goal uint)
    (total-stx uint)
  )
  (if (is-eq goal u0)
    u0
    (let (
        (progress (if (>= total-stx goal) u100 (/ (* total-stx u100) goal)))
        (rate (+ rate-min (/ (* rate-spread (- u100 progress)) u100)))
      )
      (/ (* contribution-stx-eq rate) rate-scale)
    )
  )
)

;; -- Admin --

(define-public (set-token-uri (new-uri (string-utf8 256)))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set token-uri new-uri)
    (print { event: "token-uri-updated", uri: new-uri })
    (ok true)
  )
)

(define-public (set-sbtc-rate (numerator uint) (denominator uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (asserts! (> denominator u0) err-invalid-rate)
    (var-set sbtc-to-stx-numerator numerator)
    (var-set sbtc-to-stx-denominator denominator)
    (print {
      event: "sbtc-rate-updated",
      numerator: numerator,
      denominator: denominator,
    })
    (ok true)
  )
)
