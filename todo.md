# Shri Algo — Paper Trading SaaS TODO

## Phase 1: Architecture & Database Schema
- [x] Design database schema: users, strategies, orders, positions, trades, risk_configs, plan_subscriptions
- [x] Create Drizzle schema with all tables and relationships
- [x] Generate and apply database migrations

## Phase 2: Core Execution Engine
- [x] Implement Strategy Service (CRUD, validation, state management)
- [x] Implement Order Manager (lifecycle: CREATED → QUEUED → EXECUTED → CLOSED)
- [x] Implement Position Manager (track entry price, current price, unrealized/realized P&L)
- [x] Implement Risk Engine (stoploss, target, trailing SL, MTM limits, re-entry logic)
- [x] Implement Execution Loop (runs every 1-3 seconds, evaluates active strategies)
- [x] Add comprehensive logging system for all engine decisions
- [x] Implement fault tolerance and state persistence

## Phase 3: Market Data & Job Queue
- [x] Implement simulated market data service (LTP updates, volatility simulation)
- [ ] Set up BullMQ job queue for background execution
- [ ] Implement strategy evaluation worker
- [ ] Add idempotency checks to prevent duplicate trades
- [ ] Implement worker crash recovery

## Phase 4: Backend API (tRPC Procedures)
- [x] Strategy CRUD procedures (create, read, update, delete, list)
- [x] Strategy activation/deactivation procedures
- [x] Order placement procedures (market and limit orders)
- [x] Position tracking procedures
- [x] Trade history procedures
- [x] Risk config procedures
- [x] Dashboard stats procedures (portfolio overview, P&L, open positions)
- [x] Plan gating middleware (enforce free vs paid limits)

## Phase 5: Frontend - Dashboard
- [x] Create DashboardLayout with sidebar navigation
- [x] Build Portfolio Overview component (total capital, P&L, open positions)
- [ ] Build Trade History table
- [x] Build real-time P&L tracker with candlestick charts
- [x] Implement responsive design and elegant styling

## Phase 6: Frontend - Strategy Builder
- [x] Create Strategy Builder UI with rule-based interface
- [x] Add entry condition builder (price, indicator triggers)
- [x] Add exit condition builder
- [x] Add guided tooltips throughout (beginner-friendly)
- [x] Implement strategy preview/validation
- [ ] Add strategy activation/deactivation controls

## Phase 7: Frontend - Risk Management & Order Logs
- [ ] Build Risk Management panel (max drawdown, daily loss limits, position sizing)
- [ ] Build Order Log component (full history with timestamps)
- [ ] Build Trade Log component (per-trade P&L)
- [ ] Add filtering and search capabilities

## Phase 8: Authentication & Plan Gating
- [ ] Implement Manus OAuth integration (already scaffolded)
- [ ] Create subscription/plan table in database
- [ ] Implement free vs paid plan enforcement in procedures
- [ ] Add plan status to user profile
- [ ] Create plan upgrade flow
- [ ] Add plan gating UI (show "Upgrade to unlock" for paid features)

## Phase 9: Admin Panel
- [ ] Create admin-only routes and procedures
- [ ] Build user management view (list all users, plan status)
- [ ] Build platform statistics dashboard
- [ ] Add admin-only navigation in sidebar
- [ ] Implement role-based access control (owner only)

## Phase 10: Landing Page
- [x] Design landing page layout (hero, features, pricing, CTA)
- [x] Build feature highlights section
- [x] Build pricing tiers section (free vs paid)
- [x] Add sign-up CTA buttons
- [x] Implement responsive design

## Phase 11: Testing & Polish
- [ ] Write Vitest tests for core execution engine
- [ ] Write Vitest tests for tRPC procedures
- [ ] Write Vitest tests for plan gating logic
- [ ] Test strategy execution flow end-to-end
- [ ] Test order lifecycle
- [ ] Test P&L calculations
- [ ] Polish UI/UX across all pages
- [ ] Performance optimization

## Phase 12: Deployment & Final Delivery
- [ ] Configure environment variables
- [ ] Set up secrets (JWT_SECRET, OAuth, etc.)
- [ ] Create production checkpoint
- [ ] Deploy to Manus platform
- [ ] Verify all features work in production
- [ ] Document API and usage

## Execution Engine Architecture (Reference)

### Strategy Lifecycle
CREATED → READY → ACTIVE → RUNNING → COMPLETED / STOPPED

### Strategy Data Structure
```json
{
  "strategy_id": "string",
  "entry": {
    "type": "time | signal",
    "value": "string"
  },
  "legs": [
    {
      "instrument": "string",
      "type": "CE | PE",
      "action": "BUY | SELL",
      "strike": "ATM | OTM | value",
      "quantity": "number",
      "stoploss": "number",
      "target": "number",
      "trailing_sl": "boolean"
    }
  ],
  "overall": {
    "mtm_stoploss": "number",
    "mtm_target": "number"
  },
  "reentry": {
    "enabled": "boolean",
    "max_reentries": "number"
  }
}
```

### Order Lifecycle
CREATED → QUEUED → EXECUTED → CLOSED

### Execution Loop (1-3 seconds)
1. Fetch latest price
2. Evaluate entry/exit conditions
3. Update positions
4. Apply risk rules
5. Log all decisions
