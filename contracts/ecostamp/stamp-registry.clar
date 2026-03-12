;; EcoStamp -- stamp-registry.clar
;; Semi-Fungible Token (SIP-013) registry for eco travel stamps.
;;
;; Each provider type is a unique token class (token-id = provider-id).
;; Minting requires a valid secp256k1 booking proof signed by the provider's key.
;; Replay protection via (user, provider, booking-hash) tuple.

;; --- Traits -------------------------------------------------------------------
;; SIP-013 semi-fungible token trait (abbreviated for hackathon -- core functions only)

;; --- Error codes --------------------------------------------------------------
(define-constant ERR_UNAUTHORIZED        (err u200))
(define-constant ERR_INVALID_PROOF       (err u201))
(define-constant ERR_PROOF_USED          (err u202))
(define-constant ERR_PROVIDER_NOT_ACTIVE (err u203))
(define-constant ERR_NOT_FOUND          (err u204))
(define-constant ERR_INSUFFICIENT_BALANCE (err u205))

;; --- Constants ----------------------------------------------------------------
(define-constant CONTRACT_OWNER tx-sender)

;; Provider point weights by category (used for tier calculation)
;; hotel=3, airline=5, train=2, car-share=2, cruise=6, bus=1, activity=1, restaurant=1
(define-constant POINT_WEIGHTS (list u3 u5 u2 u2 u6 u1 u1 u1))

;; Tier thresholds (total weighted points)
(define-constant TIER_SILVER_THRESHOLD u20)
(define-constant TIER_GOLD_THRESHOLD   u60)

;; --- Data vars ----------------------------------------------------------------
(define-data-var provider-registry-contract principal CONTRACT_OWNER)
(define-data-var total-stamps-minted uint u0)
(define-data-var sig-verification-enabled bool false)

;; --- Data maps ----------------------------------------------------------------

;; SFT balances: (user, token-id) -> amount
(define-map balances
  { owner: principal, token-id: uint }
  { amount: uint }
)

;; Per-user totals (stamp count + eco points)
(define-map user-totals
  { user: principal }
  { stamps: uint, points: uint }
)

;; Replay protection: booking-hash already used by this user+provider
(define-map proof-used
  { user: principal, provider-id: uint, booking-hash: (buff 32) }
  { used: bool, block-height: uint }
)

;; Stamp metadata record (one per mint event)
(define-map stamp-records
  { stamp-id: uint }
  {
    user:          principal,
    provider-id:   uint,
    booking-hash:  (buff 32),
    minted-at:     uint,        ;; block height
    eco-points:    uint,
  }
)

(define-data-var next-stamp-id uint u1)

;; --- Read-only ----------------------------------------------------------------
(define-read-only (get-balance (owner principal) (token-id uint))
  (default-to u0
    (get amount (map-get? balances { owner: owner, token-id: token-id }))
  )
)

(define-read-only (get-total-stamps (user principal))
  (default-to u0
    (get stamps (map-get? user-totals { user: user }))
  )
)

(define-read-only (get-stamp-record (stamp-id uint))
  (map-get? stamp-records { stamp-id: stamp-id })
)

(define-read-only (is-proof-used (user principal) (provider-id uint) (booking-hash (buff 32)))
  (is-some (map-get? proof-used { user: user, provider-id: provider-id, booking-hash: booking-hash }))
)

;; Calculate weighted eco points for a user across all provider types
(define-read-only (get-eco-points (user principal))
  (default-to u0
    (get points (map-get? user-totals { user: user }))
  )
)

;; Tier: 0=bronze, 1=silver, 2=gold
(define-read-only (get-tier (user principal))
  (let ((points (get-eco-points user)))
    (if (>= points TIER_GOLD_THRESHOLD)
      u2
      (if (>= points TIER_SILVER_THRESHOLD)
        u1
        u0
      )
    )
  )
)

(define-read-only (get-total-minted)
  (var-get total-stamps-minted)
)

(define-read-only (get-sig-verification-enabled)
  (var-get sig-verification-enabled)
)

;; --- Public functions ---------------------------------------------------------

;; Core mint: user submits booking proof signed by provider oracle
(define-public (earn-stamp
  (provider-id uint)
  (booking-hash (buff 32))
  (booking-proof (buff 65))    ;; secp256k1 recoverable signature
  (eco-points uint))
  (let
    (
      (caller       tx-sender)
      (stamp-id     (var-get next-stamp-id))
    )
    ;; Check replay
    (asserts!
      (not (is-proof-used caller provider-id booking-hash))
      ERR_PROOF_USED
    )

    ;; Provider must be approved in provider-registry
    (asserts!
      (contract-call? (var-get provider-registry-contract) is-approved provider-id)
      ERR_PROVIDER_NOT_ACTIVE
    )

    ;; Optional Phase 5: enable real secp256k1 proof checking.
    ;; msgHash = sha256(booking-hash || to-consensus-buff(provider-id))
    (if (var-get sig-verification-enabled)
      (let
        (
          (pid-buf (unwrap! (to-consensus-buff? provider-id) ERR_INVALID_PROOF))
          (msg-hash (sha256 (concat booking-hash pid-buf)))
          (pubkey   (unwrap! (secp256k1-recover? msg-hash booking-proof) ERR_INVALID_PROOF))
          (key-hash-opt (contract-call? (var-get provider-registry-contract) get-signing-key-hash provider-id))
        )
        (let ((key-hash (unwrap! key-hash-opt ERR_INVALID_PROOF)))
          (asserts! (is-eq (sha256 pubkey) key-hash) ERR_INVALID_PROOF)
        )
      )
      true
    )

    ;; Mark proof used
    (map-set proof-used
      { user: caller, provider-id: provider-id, booking-hash: booking-hash }
      { used: true, block-height: block-height }
    )

    ;; Mint SFT
    (map-set balances
      { owner: caller, token-id: provider-id }
      { amount: (+ (get-balance caller provider-id) u1) }
    )

    ;; Update user totals
    (let
      (
        (prev (default-to { stamps: u0, points: u0 } (map-get? user-totals { user: caller })))
      )
      (map-set user-totals
        { user: caller }
        { stamps: (+ (get stamps prev) u1), points: (+ (get points prev) eco-points) }
      )
    )

    ;; Record stamp
    (map-set stamp-records
      { stamp-id: stamp-id }
      {
        user:         caller,
        provider-id:  provider-id,
        booking-hash: booking-hash,
        minted-at:    block-height,
        eco-points:   eco-points,
      }
    )

    (var-set next-stamp-id (+ stamp-id u1))
    (var-set total-stamps-minted (+ (var-get total-stamps-minted) u1))

    ;; Increment provider stamp counter
    (try! (contract-call? (var-get provider-registry-contract) increment-stamps-issued provider-id))

    (print {
      event:       "stamp-minted",
      stamp-id:    stamp-id,
      user:        caller,
      provider-id: provider-id,
      eco-points:  eco-points,
    })

    (ok stamp-id)
  )
)

;; SIP-013 compatible transfer (optional for Phase 1)
(define-public (transfer
  (token-id uint)
  (amount uint)
  (sender principal)
  (recipient principal))
  (let ((sender-bal (get-balance sender token-id)))
    (asserts! (is-eq tx-sender sender) ERR_UNAUTHORIZED)
    (asserts! (>= sender-bal amount) ERR_INSUFFICIENT_BALANCE)

    (map-set balances { owner: sender, token-id: token-id }
      { amount: (- sender-bal amount) })
    (map-set balances { owner: recipient, token-id: token-id }
      { amount: (+ (get-balance recipient token-id) amount) })

    (print { event: "stamp-transferred", token-id: token-id, amount: amount,
             from: sender, to: recipient })
    (ok true)
  )
)

;; Admin: set provider registry contract address
(define-public (set-provider-registry (new-registry principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set provider-registry-contract new-registry)
    (ok true)
  )
)

;; Admin: enable signature verification
(define-public (enable-sig-verification)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set sig-verification-enabled true)
    (ok true)
  )
)

;; Admin: disable signature verification (testnet safety / rollback)
(define-public (disable-sig-verification)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set sig-verification-enabled false)
    (ok true)
  )
)
