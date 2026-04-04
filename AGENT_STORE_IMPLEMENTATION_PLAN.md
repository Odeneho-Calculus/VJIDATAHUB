# AGENT STORES IMPLEMENTATION PLAN

## Purpose
This document captures the **full implementation blueprint** of Agent Stores in this platform so you can reproduce it on another site with the same behavior.

It covers:
- Agent/Admin store management
- Public storefront rendering
- Guest checkout + payment verification
- Order tracking
- Agent fee activation flow
- Admin moderation (temporary ban + protocol activation)
- Agent commissions + payout lifecycle
- Supporting network catalog/logo management

---

## 1) System Architecture (Store Domain)

### Backend modules involved
- `backend/src/models/Store.js`
- `backend/src/models/Order.js`
- `backend/src/models/User.js`
- `backend/src/models/Guest.js`
- `backend/src/models/Transaction.js`
- `backend/src/models/AgentFeePayment.js`
- `backend/src/models/AgentCommissionPayout.js`
- `backend/src/models/SystemSettings.js`
- `backend/src/controllers/storeController.js`
- `backend/src/controllers/adminController.js`
- `backend/src/controllers/dataPlanController.js`
- `backend/src/routes/store.js`
- `backend/src/routes/admin.js`
- `backend/src/routes/dataplans.js`
- `backend/src/middleware/auth.js`

### Frontend modules involved
- `frontend/src/services/api.js` (`storeAPI`, `admin` API group)
- `frontend/src/App.jsx` (store/public route wiring)
- `frontend/src/pages/AdminStore.jsx`
- `frontend/src/pages/AdminAgentStores.jsx`
- `frontend/src/pages/AdminDashboard.jsx` (agent dashboard store widgets)
- `frontend/src/pages/AgentStoreOrders.jsx`
- `frontend/src/pages/AgentCommissions.jsx`
- `frontend/src/pages/AdminCommissions.jsx`
- `frontend/src/pages/PublicStore.jsx`
- `frontend/src/pages/StoreCatalogue.jsx`
- `frontend/src/components/GuestCheckoutModal.jsx`
- `frontend/src/pages/StorePaymentSuccess.jsx`
- `frontend/src/pages/TrackOrder.jsx`
- `frontend/src/pages/AdminDataPlans.jsx` (network logos used in public store)

### Router mounting
- Store routes mounted at: `/api/store`
- Admin routes mounted at: `/api/admin`
- Dataplans routes mounted at: `/api/dataplans`

---

## 2) Data Model Blueprint

## 2.1 `Store`
Core fields:
- `owner` (unique User ref; one store per owner)
- `slug` (unique, lowercase)
- `name`, `logo`
- `theme.primaryColor` (+ secondary/accent/dark mode defaults)
- `plans[]`:
  - `planId`, `planType` (`DataPlan` only), `customPrice`, `isActive`, `network`, `dataSize`
- `socialLinks` object with entries (`whatsapp`, `phone`, `facebook`, `instagram`, `twitter`) each with `{ value, label }`
- `content`:
  - `heroBadge`, `heroTitle`, `heroSubtitle`, `features[]` (title/description/icon)
- moderation fields:
  - `isActive`
  - `isTemporarilyBanned`
  - `temporaryBanReason`
  - `temporaryBanUntil`
  - `temporaryBanBy`

## 2.2 `User` store-related fields
- `role`: `user | agent | admin`
- `agentFeeStatus`: `pending | paid | protocol`
- `agentFeePaidAt`, `agentFeePaidReference`
- `protocolActivatedAt`, `protocolActivatedBy`

## 2.3 `Order` store-specific usage
- `source = 'store'`
- `isGuest = true` for public store purchases
- `guestInfo` reference
- payment fields: `paystackReference`, `transactionReference`, `transactionId`, `paymentStatus`
- delivery/provider fields: `provider`, `providerOrderId`, `providerTransactionCode`, `providerMessage`, `errorMessage`
- commission fields: `adminBasePrice`, `agentCommission`
- AFA fields: `isAfaRegistration`, `orderCategory`, `afaRegistration{...}`

## 2.4 `AgentFeePayment`
- `agentId`, `storeId`, `amount`, `reference`
- `status`: `pending | paid | failed | protocol`
- `paidAt`, `paystackResponse`

## 2.5 `AgentCommissionPayout`
- `agentId`, `amount`, `requestedAmount`
- fee fields: `withdrawalFeeType`, `withdrawalFeeValue`, `withdrawalFeeAmount`, `netAmount`
- destination: `method` (`bank | mobile_money`), `details{...}`
- `status`: `pending | processing | paid | rejected`
- admin/payment execution fields: `adminNote`, `paidBy`, `paidAt`, `paystackTransfer{...}`

## 2.6 `SystemSettings` impacting stores
- `vtuProvider`
- `agentFeeSettings.registrationFee`
- `commissionSettings.{minWithdrawal,maxWithdrawal,withdrawalFeeType,withdrawalFeeValue}`
- `networkCatalog[]` with `name, slug, logoUrl, isActive`

---

## 3) Auth & Access Control Rules

Middleware logic:
- `protect`: JWT required, blocks deleted/banned/suspended users
- `adminOnly`: admin role only
- `adminOrAgent`: roles `admin` or `agent`

Store route access:
- Private owner store APIs: `protect + adminOrAgent`
- Public storefront APIs: no auth

Admin moderation APIs:
- `protect + adminOnly`

---

## 4) Backend API Surface (Exact Store Domain)

## 4.1 Owner/Agent store APIs (`/api/store`)
1. `GET /my-store`
   - Auto-creates store if missing
   - Returns `store` + computed `accessStatus`
   - Migrates legacy social link strings to `{value,label}` object shape

2. `PATCH /my-store`
   - Updates branding/content/social/theme/slug
   - Validates slug uniqueness against other owners
   - Uses upsert

3. `POST /my-store/plans`
   - Adds or replaces plan in store by `planId`
   - Validates: required fields, `planType=DataPlan`, positive `customPrice`
   - Agent-only constraint: custom price cannot be below admin selling price

4. `PATCH /my-store/plans/:planId`
   - Updates plan custom price with same price floor guard for agents

5. `DELETE /my-store/plans/:planId`
   - Removes plan from store

6. `GET /my-store/orders/stats`
   - Aggregates counts + revenue for `source='store'`
   - Includes commission snapshot

7. `GET /my-store/orders`
   - Paginated order list with status/search filters
   - Search covers orderNumber, phone, plan, network, buyer email (via `Guest`)

8. `GET /my-store/commissions/summary`
   - Returns earned/pending/paid/available + withdrawal constraints from settings

9. `GET /my-store/commissions/payouts`
   - Paginated payout history

10. `POST /my-store/commissions/payouts`
   - Creates payout request
   - Validates method-specific details, min/max, available commission
   - Computes fee and net amount from settings

11. `GET /my-store/agent-fee/status`
   - Returns latest fee payment info + access status

12. `POST /my-store/agent-fee/initialize`
   - If registration fee is 0: instantly marks paid in transaction
   - Else creates pending `AgentFeePayment` and initializes Paystack transaction

13. `POST /my-store/agent-fee/verify`
   - Verifies Paystack transaction
   - Marks payment paid, fails competing pending fee records for same store
   - Sets user `agentFeeStatus='paid'`

## 4.2 Public store APIs (`/api/store`)
1. `GET /public/:slug`
   - Returns storefront branding/content/social/theme
   - Enforces availability checks (active, fee paid for agent stores, not temp banned)

2. `GET /public/:slug/plans?network=...`
   - Returns store plans with enriched `DataPlan` details
   - Overwrites selling price with store `customPrice`
   - Supports network filtering by slug/name from `SystemSettings.networkCatalog`

3. `POST /public/:slug/purchase`
   - Guest purchase initializer (Paystack)
   - Validates required inputs + email + phone/network match (except AFA)
   - For normal bundles, checks provider wallet balance before initialization
   - Creates/updates `Guest`, creates `Order`, creates pending `Transaction`
   - Initializes Paystack and returns `accessCode`/`authorizationUrl`

4. `POST /verify-payment`
   - Verifies Paystack payment by reference
   - If successful:
     - marks payment complete
     - updates transaction
     - AFA orders: queued for manual processing
     - normal orders: attempts provider purchase and writes provider refs

5. `GET /track-order?phoneNumber=...`
   - Finds guest orders by normalized phone
   - Returns condensed order history + store theme/social links

## 4.3 Admin store governance APIs (`/api/admin`)
1. `GET /agent-stores`
   - Paginated list of stores owned by agents

2. `PATCH /agent-stores/:storeId/temporary-ban`
   - Applies/removes temporary ban with duration + reason

3. `PATCH /agent-stores/:storeId/protocol-activate`
   - Admin bypass activation for agent fee
   - Creates `AgentFeePayment` status `protocol`
   - Updates user fee status to `protocol`
   - Clears temporary store ban state

4. `GET /agent-fee-payments`
   - Fee ledger with status filters (`settled` = `paid|protocol`)

5. `GET /agent-commission-payouts`
   - Commission payout queue for admins

6. `PATCH /agent-commission-payouts/:id/approve`
   - Approves mobile money payout via Paystack transfer APIs
   - Supports OTP-required flows

7. `PATCH /agent-commission-payouts/:id/paid`
   - Manual mark as paid

## 4.4 Network branding APIs affecting public store UI (`/api/dataplans`)
1. `GET /networks`
2. `POST /networks/sync` (admin)
3. `PATCH /networks/:slug/logo` (admin)

These are used by public store pages to render network logos and by admin to manage those logos.

---

## 5) Critical Business Rules (Must Keep for Parity)

1. **One store per owner** (`Store.owner` unique)
2. **Unique slug globally**
3. **Agent custom price floor**: agent cannot sell below admin base price
4. **Store availability gating** for public endpoints:
   - store active
   - agent fee paid/protocol (for agent-owned stores)
   - no active temporary ban
5. **Temporary bans auto-expire** via `resolveTemporaryBanStatus`
6. **AFA flow** differs from normal bundle flow:
   - extra required fields
   - 18+ age validation
   - no immediate provider purchase; manual admin queue
7. **Commission = store custom price - admin base price** on paid store orders
8. **Payout request must obey min/max and available commission**
9. **Provider purchase only after payment verification success**
10. **Guest tracking by phone number** with normalization

---

## 6) Frontend Implementation Map

## 6.1 Agent/Admin store owner UI
### `AdminStore.jsx`
Implements:
- Fetch and render owner store (`getMyStore`)
- Agent access lock overlay (fee unpaid / temp banned)
- Agent fee payment init + Paystack popup + verification
- Tabs:
  - General (name, slug, logo, color)
  - Landing content (hero + features)
  - Social links
  - Plans & custom pricing
- Plan add/edit/remove operations
- Public store link copy/open actions

### `AdminDashboard.jsx` (agent mode)
- Shows store health stats and recent store orders
- Shows activation/restriction banners based on access status

### `AgentStoreOrders.jsx`
- Paginated/filterable list of store orders
- Uses provider labels and order detail modal

### `AgentCommissions.jsx`
- Displays commission summary
- Payout request form (bank/mobile money)
- Payout history

## 6.2 Admin governance UI
### `AdminAgentStores.jsx`
- Lists all agent stores
- Search, pagination, details modal
- Temporary ban apply/remove
- Protocol activation action
- Agent fee amount config via `SystemSettings`
- Fee payment history table

### `AdminCommissions.jsx`
- Configure withdrawal constraints + fee model
- Process payout queue
- Toggle Paystack transfer OTP mode
- Manual mark-as-paid fallback

### `AdminDataPlans.jsx` (network logos section)
- Sync provider networks
- Set logo URLs per network slug
- Public storefront uses this visual branding

## 6.3 Public storefront UI
### `PublicStore.jsx`
- Store landing page (branding, hero, feature cards)
- Network cards route users into network catalog pages
- Handles temporary-unavailable states (`AGENT_FEE_UNPAID`, `STORE_TEMP_BANNED`)

### `StoreCatalogue.jsx`
- Fetches store + filtered plans by network
- Opens `GuestCheckoutModal`

### `GuestCheckoutModal.jsx`
- Collects phone + email (and AFA fields if applicable)
- Initializes Paystack guest purchase
- Redirects to payment success route with reference

### `StorePaymentSuccess.jsx`
- Verifies payment with backend
- Shows order number/status outcome
- Exposes track-order and return-store actions

### `TrackOrder.jsx`
- Tracks orders by phone
- Pulls store branding if slug supplied
- Shows all matching guest orders

---

## 7) End-to-End Flows

## Flow A: Agent store setup + activation
1. Agent logs in, opens Store page.
2. `GET /store/my-store` auto-creates store if absent.
3. If fee unpaid, overlay blocks operations.
4. Agent pays fee via Paystack (`initialize` -> popup -> `verify`).
5. User `agentFeeStatus` becomes `paid`; store becomes operable.
6. Agent updates slug/branding/content/social and plan pricing.

## Flow B: Admin restriction/protocol flow
1. Admin views `AdminAgentStores`.
2. Admin can apply temporary ban (`temporary-ban` with days/reason).
3. Public endpoints start returning unavailable code.
4. Admin can remove ban or protocol-activate fee status.
5. Protocol activation writes `AgentFeePayment(protocol)` and unblocks store.

## Flow C: Public guest purchase
1. Visitor opens `/store/:slug`.
2. App loads store + network catalog.
3. Visitor selects network and plan.
4. Checkout modal validates input; backend creates pending order/transaction and initializes Paystack.
5. Paystack returns reference; frontend routes to payment success page.
6. Backend verify endpoint marks payment complete and purchases from provider (or queues AFA).

## Flow D: Order tracking
1. Buyer enters phone on `/track-order`.
2. Backend normalizes phone, finds guest orders.
3. Response includes orders + store social/theme for support CTA.

## Flow E: Commission payouts
1. Commission accrues from paid store orders.
2. Agent requests payout (validated against limits and available balance).
3. Admin approves (Paystack transfer for mobile money) or marks paid manually.
4. Payout status transitions reflected in agent/admin dashboards.

---

## 8) External Integrations & Env Requirements

Required integrations:
- **Paystack**
  - transaction initialize/verify for payments
  - transfer recipient/transfer/verify for payouts
- **VTU provider (`datakazina`)**
  - wallet balance checks
  - plan/network sync
  - data purchase execution

Key env vars:
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_BASE_URL` (optional override)
- `PAYSTACK_TRANSFER_SOURCE`
- `PAYSTACK_TRANSFER_CURRENCY`
- `PAYSTACK_BANK_RECIPIENT_TYPE`
- `ORDER_STATUS_SYNC_MODE`
- `ORDER_SYNC_ENABLED`
- `BALANCE_CHECK_ENABLED`
- `JWT_SECRET`
- DB and CORS vars

---

## 9) Rebuild Checklist for Another Site

## Phase 1: Domain + DB
- [ ] Create Store/User/Order/Guest/Transaction/AgentFeePayment/AgentCommissionPayout/SystemSettings models with same fields/status enums.
- [ ] Enforce indexes/uniqueness (`Store.owner`, `Store.slug`, payment references).

## Phase 2: API foundation
- [ ] Implement auth middlewares (`protect`, role guards).
- [ ] Build `/store` private and public endpoints exactly as above.
- [ ] Build `/admin` store governance endpoints.
- [ ] Build `/dataplans/networks` endpoints for network branding.

## Phase 3: Business logic parity
- [ ] Implement access-status computation and temporary-ban auto-expiry.
- [ ] Implement slug uniqueness, price floor checks, AFA validations, commission math.
- [ ] Implement provider balance gate and purchase-after-payment verification flow.

## Phase 4: Frontend parity
- [ ] Owner store manager (tabs + plan pricing + fee lock UX).
- [ ] Admin moderation panels (store bans, protocol activation, fee settings/payments).
- [ ] Public store pages (landing, catalogue, checkout, payment success, tracking).
- [ ] Agent commission and store orders pages.

## Phase 5: Operational controls
- [ ] Add provider status sync and wallet checks.
- [ ] Add Paystack OTP controls for payouts.
- [ ] Add logging and monitoring around payment/verification/provider calls.

---

## 10) API Contract Notes (for your next site)

Use this response envelope pattern consistently:
- Success: `{ success: true, ...payload }`
- Failure: `{ success: false, message, code? }`

Important error codes/messages used by UI:
- `AGENT_FEE_UNPAID`
- `STORE_TEMP_BANNED`
- Slug conflict message for store save
- Validation messages for AFA and payout details

---

## 11) Implementation Risks to Watch

1. Race conditions around payment verification (idempotency)
2. Duplicate pending fee payments (handled by failing superseded records)
3. Inconsistent social links shape (legacy string vs object)
4. Payout transfer OTP requirements causing approval failures
5. Phone normalization mismatches breaking order tracking
6. Store plan references to deleted/inactive DataPlans

---

## 12) Recommended Enhancements When Rebuilding

If you want strict production-hardening on the next site:
- Add idempotency keys to payment verification endpoints.
- Move temporary-ban expiry cleanup to scheduled job (instead of on-read only).
- Add audit trail collection for all admin moderation actions.
- Add webhook-first payment confirmation with retry-safe reconciliation.
- Add explicit store public cache with invalidation on store updates.

---

This plan reflects the current implementation in this repository as of 2026-02-21.
