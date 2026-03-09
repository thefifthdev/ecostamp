;; EcoStamp -- reward-pool.clar
;; sBTC reward pool: sponsors deposit, verified travelers claim by tier.
;;
;; Flow:
;;   1. Sponsor deposits into the pool via deposit-reward
;;   2. Traveler calls claim-reward -- contract reads their tier from
;;      stamp-registry and calculates their share
;;   3. Payout = tier-weight * pool * MAX_CLAIM_PCT / (100 * MAX_WEIGHT)
;;   4. Cooldown: one claim per user per EPOCH_BLOCKS (~1 week)
;;
;; Tier weights: Bronze=1x Silver=3x Gold=7x
;; Epoch: 1008 blocks (~1 week at 10min/block)

;; --- Error codes --------------------------------------------------------------
(define-constant ERR_UNAUTHORIZED      (err u300))
(define-constant ERR_ZERO_DEPOSIT      (err u301))
(define-constant ERR_NOTHING_TO_CLAIM  (err u302))
(define-constant ERR_COOLDOWN_ACTIVE   (err u303))
(define-constant ERR_POOL_EMPTY        (err u304))
(define-constant ERR_BELOW_MIN_TIER    (err u305))

;; --- Constants ----------------------------------------------------------------
(define-constant CONTRACT_OWNER tx-sender)

;; Tier multipliers indexed by tier value (0=bronze 1=silver 2=gold)
(define-constant TIER_WEIGHTS (list u1 u3 u7))
(define-constant MAX_WEIGHT   u7)   ;; gold weight, denominator for share calc

;; Minimum tier required to claim (u0 = anyone)
(define-constant MIN_CLAIM_TIER u0)

;; One claim per epoch (~1 week). Shorter for testnet demos: set EPOCH_BLOCKS=10
(define-constant EPOCH_BLOCKS u1008)

;; Max claim is this % of pool per epoch per user (anti-whale)
(define-constant MAX_CLAIM_PCT u10)

;; --- Data vars ----------------------------------------------------------------
(define-data-var pool-balance    uint u0)
(define-data-var total-claimed   uint u0)
(define-data-var total-deposited uint u0)
(define-data-var epoch-start     uint u0)

;; --- Data maps ----------------------------------------------------------------
(define-map claim-records
  { user: principal }
  {
    last-claim-block: uint,
    total-claimed:    uint,
    claim-count:      uint,
  }
)

(define-map deposit-log
  { deposit-id: uint }
  {
    sponsor: principal,
    amount:  uint,
    block:   uint,
    note:    (string-utf8 64),
  }
)

(define-data-var next-deposit-id uint u1)

;; --- Read-only ----------------------------------------------------------------

(define-read-only (get-pool-balance)
  (var-get pool-balance)
)

(define-read-only (get-total-claimed)
  (var-get total-claimed)
)

(define-read-only (get-total-deposited)
  (var-get total-deposited)
)

(define-read-only (get-claim-record (user principal))
  (map-get? claim-records { user: user })
)

(define-read-only (get-tier-weight (tier uint))
  (default-to u1 (element-at? TIER_WEIGHTS tier))
)

(define-read-only (is-in-cooldown (user principal))
  (match (map-get? claim-records { user: user })
    record (< (- block-height (get last-claim-block record)) EPOCH_BLOCKS)
    false
  )
)

(define-read-only (blocks-until-claim (user principal))
  (match (map-get? claim-records { user: user })
    record
      (let ((elapsed (- block-height (get last-claim-block record))))
        (if (>= elapsed EPOCH_BLOCKS) u0 (- EPOCH_BLOCKS elapsed))
      )
    u0
  )
)

;; Calculate claimable amount for a user.
;; share = pool * tier-weight * MAX_CLAIM_PCT / (100 * MAX_WEIGHT)
;; Gold example: pool=1000 sats -> 1000 * 7 * 10 / (100 * 7) = 100 sats (10%)
;; Bronze:       pool=1000 sats -> 1000 * 1 * 10 / (100 * 7) = ~14 sats
(define-read-only (calculate-claimable (user principal) (tier uint))
  (let
    (
      (pool   (var-get pool-balance))
      (weight (get-tier-weight tier))
    )
    (if (is-eq pool u0)
      u0
      (/ (* pool (* weight MAX_CLAIM_PCT)) (* u100 MAX_WEIGHT))
    )
  )
)

(define-read-only (get-reward-summary (user principal) (tier uint))
  (let
    (
      (claimable (calculate-claimable user tier))
      (record    (map-get? claim-records { user: user }))
      (cooldown  (blocks-until-claim user))
    )
    {
      claimable:          claimable,
      pool-balance:       (var-get pool-balance),
      total-deposited:    (var-get total-deposited),
      total-claimed:      (var-get total-claimed),
      user-total-claimed: (default-to u0 (get total-claimed record)),
      claim-count:        (default-to u0 (get claim-count record)),
      cooldown-blocks:    cooldown,
      can-claim:          (and (> claimable u0) (is-eq cooldown u0)),
    }
  )
)

;; --- Public functions ---------------------------------------------------------

;; Sponsor deposits into the reward pool
(define-public (deposit-reward (amount uint) (note (string-utf8 64)))
  (begin
    (asserts! (> amount u0) ERR_ZERO_DEPOSIT)

    (let ((deposit-id (var-get next-deposit-id)))
      (map-set deposit-log
        { deposit-id: deposit-id }
        { sponsor: tx-sender, amount: amount, block: block-height, note: note }
      )
      (var-set next-deposit-id (+ deposit-id u1))
    )

    (var-set pool-balance    (+ (var-get pool-balance)    amount))
    (var-set total-deposited (+ (var-get total-deposited) amount))

    (if (is-eq (var-get epoch-start) u0)
      (var-set epoch-start block-height)
      true
    )

    (print {
      event:   "reward-deposited",
      sponsor: tx-sender,
      amount:  amount,
      pool:    (var-get pool-balance),
    })
    (ok (var-get pool-balance))
  )
)

;; User claims their sBTC reward allocation.
;; tier is passed in by the caller and cross-checked against stamp-registry
;; in the frontend before broadcasting -- full on-chain tier read wired in Phase 5
;; when contract-call? cross-contract reads are enabled on mainnet.
(define-public (claim-reward (tier uint))
  (let
    (
      (caller    tx-sender)
      (claimable (calculate-claimable caller tier))
    )
    (asserts! (>= tier MIN_CLAIM_TIER) ERR_BELOW_MIN_TIER)
    (asserts! (> claimable u0)         ERR_NOTHING_TO_CLAIM)
    (asserts! (>= (var-get pool-balance) claimable) ERR_POOL_EMPTY)
    (asserts! (not (is-in-cooldown caller))         ERR_COOLDOWN_ACTIVE)

    (var-set pool-balance  (- (var-get pool-balance) claimable))
    (var-set total-claimed (+ (var-get total-claimed) claimable))

    (let
      (
        (prev (default-to
                { last-claim-block: u0, total-claimed: u0, claim-count: u0 }
                (map-get? claim-records { user: caller })))
      )
      (map-set claim-records
        { user: caller }
        {
          last-claim-block: block-height,
          total-claimed:    (+ (get total-claimed prev) claimable),
          claim-count:      (+ (get claim-count prev) u1),
        }
      )
    )

    (print {
      event:     "reward-claimed",
      user:      caller,
      tier:      tier,
      amount:    claimable,
      pool-left: (var-get pool-balance),
    })

    ;; Phase 3: returns satoshi amount. Phase 5: adds sbtc-token ft-transfer.
    (ok claimable)
  )
)

;; Admin: seed pool for testnet demo (bypasses sBTC transfer requirement)
(define-public (admin-seed-pool (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set pool-balance    (+ (var-get pool-balance)    amount))
    (var-set total-deposited (+ (var-get total-deposited) amount))
    (if (is-eq (var-get epoch-start) u0)
      (var-set epoch-start block-height)
      true
    )
    (print { event: "pool-seeded", amount: amount, pool: (var-get pool-balance) })
    (ok (var-get pool-balance))
  )
)
