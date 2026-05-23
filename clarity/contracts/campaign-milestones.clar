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
;; live fundraising contract via the donation-source-trait.
