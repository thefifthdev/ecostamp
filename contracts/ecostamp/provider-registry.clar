;; EcoStamp -- provider-registry.clar
;; Manages verified eco travel provider listings and their signing keys.
;;
;; Providers apply -> verifier approves -> signing key hash registered
;; Provider can be revoked by the designated verifier wallet.

;; --- Error codes --------------------------------------------------------------
(define-constant ERR_UNAUTHORIZED        (err u100))
(define-constant ERR_ALREADY_EXISTS      (err u101))
(define-constant ERR_NOT_FOUND          (err u102))
(define-constant ERR_INVALID_STATUS     (err u103))
(define-constant ERR_INVALID_ECO_SCORE  (err u104))
(define-constant ERR_INVALID_CATEGORY   (err u105))

;; --- Constants ----------------------------------------------------------------
(define-constant CONTRACT_OWNER tx-sender)
(define-constant STATUS_PENDING  u0)
(define-constant STATUS_APPROVED u1)
(define-constant STATUS_REVOKED  u2)

;; Allowed provider categories
(define-constant VALID_CATEGORIES (list
  "hotel"
  "airline"
  "train"
  "car-share"
  "cruise"
  "bus"
  "activity"
  "restaurant"
))

;; --- Data vars ----------------------------------------------------------------
(define-data-var verifier-address principal CONTRACT_OWNER)
(define-data-var next-provider-id uint u1)

;; --- Data maps ----------------------------------------------------------------
(define-map providers
  { provider-id: uint }
  {
    name:         (string-utf8 64),
    category:     (string-ascii 32),
    eco-score:    uint,                ;; 1-100
    status:       uint,                ;; 0=pending 1=approved 2=revoked
    owner:        principal,
    signing-key-hash: (optional (buff 32)),  ;; sha256(compressed-pubkey), set on approval
    registered-at:    uint,            ;; block height
    approved-at:      (optional uint),
    stamps-issued:    uint,
  }
)

;; Reverse index: wallet -> provider-id
(define-map owner-to-provider
  { owner: principal }
  { provider-id: uint }
)

;; Stamp registry contract allowed to increment stamps-issued (wired post-deploy)
(define-data-var stamp-registry-contract principal CONTRACT_OWNER)

;; --- Read-only helpers --------------------------------------------------------
(define-read-only (get-provider (provider-id uint))
  (map-get? providers { provider-id: provider-id })
)

(define-read-only (get-provider-by-owner (owner principal))
  (match (map-get? owner-to-provider { owner: owner })
    entry (get-provider (get provider-id entry))
    none
  )
)

(define-read-only (get-provider-id-by-owner (owner principal))
  (map-get? owner-to-provider { owner: owner })
)

(define-read-only (get-next-id)
  (var-get next-provider-id)
)

(define-read-only (get-verifier)
  (var-get verifier-address)
)

(define-read-only (is-approved (provider-id uint))
  (match (get-provider provider-id)
    p (is-eq (get status p) STATUS_APPROVED)
    false
  )
)

(define-read-only (get-signing-key-hash (provider-id uint))
  (match (get-provider provider-id)
    p (get signing-key-hash p)
    none
  )
)

;; --- Public functions ---------------------------------------------------------

;; Provider applies for listing
(define-public (apply-provider
  (name (string-utf8 64))
  (category (string-ascii 32))
  (eco-score uint))
  (let
    (
      (provider-id (var-get next-provider-id))
      (caller tx-sender)
    )
    ;; Each wallet can only have one provider application
    (asserts! (is-none (map-get? owner-to-provider { owner: caller })) ERR_ALREADY_EXISTS)
    ;; Category must be in VALID_CATEGORIES
    (asserts! (is-some (index-of? VALID_CATEGORIES category)) ERR_INVALID_CATEGORY)
    ;; Eco score must be 1-100
    (asserts! (and (>= eco-score u1) (<= eco-score u100)) ERR_INVALID_ECO_SCORE)

    (map-set providers
      { provider-id: provider-id }
      {
        name:              name,
        category:          category,
        eco-score:         eco-score,
        status:            STATUS_PENDING,
        owner:             caller,
        signing-key-hash:  none,
        registered-at:     block-height,
        approved-at:       none,
        stamps-issued:     u0,
      }
    )
    (map-set owner-to-provider { owner: caller } { provider-id: provider-id })
    (var-set next-provider-id (+ provider-id u1))

    (print { event: "provider-applied", provider-id: provider-id, name: name, owner: caller })
    (ok provider-id)
  )
)

;; Verifier approves a provider and registers their signing key hash
(define-public (approve-provider (provider-id uint) (signing-key-hash (buff 32)))
  (let
    (
      (caller tx-sender)
      (provider (unwrap! (get-provider provider-id) ERR_NOT_FOUND))
    )
    (asserts! (is-eq caller (var-get verifier-address)) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status provider) STATUS_PENDING) ERR_INVALID_STATUS)

    (map-set providers
      { provider-id: provider-id }
      (merge provider {
        status:           STATUS_APPROVED,
        signing-key-hash: (some signing-key-hash),
        approved-at:      (some block-height),
      })
    )

    (print { event: "provider-approved", provider-id: provider-id })
    (ok true)
  )
)

;; Verifier revokes a provider
(define-public (revoke-provider (provider-id uint))
  (let
    (
      (caller tx-sender)
      (provider (unwrap! (get-provider provider-id) ERR_NOT_FOUND))
    )
    (asserts! (is-eq caller (var-get verifier-address)) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status provider) STATUS_APPROVED) ERR_INVALID_STATUS)

    (map-set providers
      { provider-id: provider-id }
      (merge provider { status: STATUS_REVOKED })
    )

    (print { event: "provider-revoked", provider-id: provider-id })
    (ok true)
  )
)

;; Increment stamps-issued counter (called by stamp-registry)
(define-public (increment-stamps-issued (provider-id uint))
  (let ((provider (unwrap! (get-provider provider-id) ERR_NOT_FOUND)))
    ;; Only stamp-registry contract can call this in production;
    ;; For hackathon we also allow the verifier to call it.
    (asserts!
      (or
        (is-eq tx-sender (var-get verifier-address))
        (is-eq contract-caller (var-get stamp-registry-contract))
      )
      ERR_UNAUTHORIZED
    )
    (map-set providers
      { provider-id: provider-id }
      (merge provider { stamps-issued: (+ (get stamps-issued provider) u1) })
    )
    (ok true)
  )
)

;; Owner-only: set stamp registry contract principal
(define-public (set-stamp-registry (new-stamp-registry principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set stamp-registry-contract new-stamp-registry)
    (ok true)
  )
)

;; Read-only: current stamp registry principal
(define-read-only (get-stamp-registry)
  (var-get stamp-registry-contract)
)

;; Owner-only: rotate verifier wallet
(define-public (set-verifier (new-verifier principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set verifier-address new-verifier)
    (ok true)
  )
)
