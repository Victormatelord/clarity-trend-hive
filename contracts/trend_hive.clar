;; TrendHive Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-voted (err u102))
(define-constant err-invalid-trend (err u103))
(define-constant err-cannot-vote-own (err u104))
(define-constant err-empty-input (err u105))

;; Data Variables
(define-data-var next-trend-id uint u0)

;; Data Maps
(define-map trends 
    uint 
    {
        creator: principal,
        title: (string-utf8 100),
        description: (string-utf8 500),
        image-url: (string-utf8 200),
        category: (string-utf8 50),
        created-at: uint,
        votes: uint,
        score: uint,
        active: bool
    }
)

(define-map user-votes 
    {user: principal, trend-id: uint} 
    {voted: bool}
)

(define-map user-rewards principal uint)

;; Public Functions

;; Post a new trend
(define-public (post-trend (title (string-utf8 100)) 
                         (description (string-utf8 500))
                         (image-url (string-utf8 200))
                         (category (string-utf8 50)))
    (let
        ((trend-id (var-get next-trend-id)))
        
        ;; Input validation
        (asserts! (> (len title) u0) err-empty-input)
        (asserts! (> (len description) u0) err-empty-input)
        (asserts! (> (len image-url) u0) err-empty-input)
        (asserts! (> (len category) u0) err-empty-input)
        
        (map-set trends trend-id {
            creator: tx-sender,
            title: title,
            description: description,
            image-url: image-url,
            category: category,
            created-at: block-height,
            votes: u0,
            score: u0,
            active: true
        })
        (var-set next-trend-id (+ trend-id u1))
        (ok trend-id)
    )
)

;; Upvote a trend
(define-public (upvote-trend (trend-id uint))
    (let
        ((trend (unwrap! (map-get? trends trend-id) err-not-found))
         (vote-key {user: tx-sender, trend-id: trend-id}))
        
        ;; Check if trend is active
        (asserts! (get active trend) err-invalid-trend)
        
        ;; Check if user is not the creator
        (asserts! (not (is-eq tx-sender (get creator trend))) err-cannot-vote-own)
        
        ;; Check if user already voted
        (asserts! (is-none (map-get? user-votes vote-key)) err-already-voted)
        
        ;; Record vote
        (map-set user-votes vote-key {voted: true})
        
        ;; Update trend votes and score
        (map-set trends trend-id 
            (merge trend {
                votes: (+ (get votes trend) u1),
                score: (calculate-trend-score 
                    (+ (get votes trend) u1) 
                    (- block-height (get created-at trend)))
            })
        )
        
        ;; Calculate and distribute rewards
        (try! (distribute-rewards trend-id (get creator trend)))
        (ok true)
    )
)

;; Moderate trend (owner only)
(define-public (moderate-trend (trend-id uint) (active bool))
    (let ((trend (unwrap! (map-get? trends trend-id) err-not-found)))
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (map-set trends trend-id (merge trend {active: active}))
        (ok true)
    )
)

;; Private Functions

;; Calculate trend score based on votes and time
(define-private (calculate-trend-score (votes uint) (age uint))
    (let
        ((gravity u1))
        (if (is-eq age u0)
            (* votes u100000)
            (/ (* votes u100000) (+ age u2))
        )
    )
)

;; Distribute rewards to trend creator
(define-private (distribute-rewards (trend-id uint) (creator principal))
    (let
        ((current-rewards (default-to u0 (map-get? user-rewards creator)))
         (new-rewards (+ current-rewards u10)))
        (map-set user-rewards creator new-rewards)
        (ok true)
    )
)

;; Read-only Functions

;; Get trend details
(define-read-only (get-trend (trend-id uint))
    (map-get? trends trend-id)
)

;; Get user rewards
(define-read-only (get-user-rewards (user principal))
    (default-to u0 (map-get? user-rewards user))
)

;; Get total trends count
(define-read-only (get-trends-count)
    (var-get next-trend-id)
)
