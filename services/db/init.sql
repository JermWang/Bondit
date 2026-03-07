-- BondIt.lol Agency Launch System — Database Schema

-- Launches
CREATE TABLE IF NOT EXISTS launches (
    launch_id       TEXT PRIMARY KEY,
    creator         TEXT NOT NULL,
    mint            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    symbol          TEXT NOT NULL,
    uri             TEXT,
    launch_mode     SMALLINT NOT NULL DEFAULT 0,
    status          SMALLINT NOT NULL DEFAULT 0,
    curve_state     TEXT,
    vault_state     TEXT,
    policy_state    TEXT,
    adapter_state   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graduated_at    TIMESTAMPTZ,
    flight_mode_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_launches_status ON launches(status);
CREATE INDEX IF NOT EXISTS idx_launches_mint ON launches(mint);

-- Indexed Raw Events
CREATE TABLE IF NOT EXISTS indexed_events (
    id              BIGSERIAL PRIMARY KEY,
    program         TEXT NOT NULL,
    event_name      TEXT NOT NULL,
    discriminator   TEXT NOT NULL,
    storage_target  TEXT NOT NULL,
    tx_signature    TEXT NOT NULL,
    raw_base64      TEXT NOT NULL,
    raw_hex         TEXT NOT NULL,
    decoded_payload JSONB,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tx_signature, event_name, discriminator)
);

CREATE INDEX IF NOT EXISTS idx_indexed_events_signature ON indexed_events(tx_signature);
CREATE INDEX IF NOT EXISTS idx_indexed_events_program ON indexed_events(program, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_indexed_events_storage_target ON indexed_events(storage_target, received_at DESC);

-- Trades (bonding curve)
CREATE TABLE IF NOT EXISTS trades (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT NOT NULL REFERENCES launches(launch_id),
    trader          TEXT NOT NULL,
    is_buy          BOOLEAN NOT NULL,
    sol_amount      BIGINT NOT NULL,
    token_amount    BIGINT NOT NULL,
    fee             BIGINT NOT NULL,
    tokens_sold_after BIGINT NOT NULL,
    raised_sol_after  BIGINT NOT NULL,
    tx_signature    TEXT NOT NULL UNIQUE,
    slot            BIGINT NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_launch ON trades(launch_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_trader ON trades(trader);

-- Policy Actions (immutable log)
CREATE TABLE IF NOT EXISTS policy_actions (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT NOT NULL REFERENCES launches(launch_id),
    action_type     TEXT NOT NULL,
    action_index    BIGINT NOT NULL,
    description     TEXT,
    amounts         JSONB,
    tx_signature    TEXT NOT NULL UNIQUE,
    slot            BIGINT NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_actions_launch ON policy_actions(launch_id, action_index);

-- Holder Snapshots (periodic)
CREATE TABLE IF NOT EXISTS holder_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT NOT NULL REFERENCES launches(launch_id),
    holders_count   INTEGER NOT NULL,
    top10_concentration_bps SMALLINT NOT NULL,
    top10_holders   JSONB,
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holder_snapshots_launch ON holder_snapshots(launch_id, snapshot_at DESC);

-- Liquidity Snapshots
CREATE TABLE IF NOT EXISTS liquidity_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT NOT NULL REFERENCES launches(launch_id),
    venue           TEXT NOT NULL,
    lp_depth_usd    BIGINT NOT NULL,
    depth_2pct_usd  BIGINT,
    depth_5pct_usd  BIGINT,
    total_liquidity_sol   BIGINT,
    total_liquidity_tokens BIGINT,
    fees_harvested_sol    BIGINT,
    fees_harvested_tokens BIGINT,
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_liquidity_snapshots_launch ON liquidity_snapshots(launch_id, snapshot_at DESC);

-- Treasury Snapshots
CREATE TABLE IF NOT EXISTS treasury_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT NOT NULL REFERENCES launches(launch_id),
    remaining       BIGINT NOT NULL,
    remaining_pct   NUMERIC(5,2) NOT NULL,
    released_total  BIGINT NOT NULL,
    released_today  BIGINT NOT NULL,
    released_week   BIGINT NOT NULL,
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_snapshots_launch ON treasury_snapshots(launch_id, snapshot_at DESC);

-- Volatility / Volume Metrics
CREATE TABLE IF NOT EXISTS market_metrics (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT NOT NULL REFERENCES launches(launch_id),
    price_usd       NUMERIC(20,10),
    price_sol       NUMERIC(20,10),
    volume_1h_usd   BIGINT,
    volume_24h_usd  BIGINT,
    volatility_1h_bps  SMALLINT,
    volatility_24h_bps SMALLINT,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_metrics_launch ON market_metrics(launch_id, recorded_at DESC);

-- AI Outputs (logged per spec §7)
CREATE TABLE IF NOT EXISTS ai_outputs (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT,
    output_type     TEXT NOT NULL,
    prompt_hash     TEXT NOT NULL,
    model_id        TEXT NOT NULL,
    operator_key    TEXT,
    content         JSONB NOT NULL,
    disclaimer      TEXT NOT NULL DEFAULT 'advisory only',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_outputs_launch ON ai_outputs(launch_id, created_at DESC);

-- Emergency Events
CREATE TABLE IF NOT EXISTS emergency_events (
    id              BIGSERIAL PRIMARY KEY,
    launch_id       TEXT NOT NULL REFERENCES launches(launch_id),
    event_type      TEXT NOT NULL,
    triggered_by    TEXT NOT NULL,
    reason          TEXT,
    tx_signature    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_events_launch ON emergency_events(launch_id);

-- Vanity Backlog (pre-ground vanity idempotency keys)
CREATE TABLE IF NOT EXISTS vanity_backlog (
    id              BIGSERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    launch_id_hex   TEXT NOT NULL,
    mint_address    TEXT NOT NULL,
    suffix          TEXT NOT NULL DEFAULT 'LoL',
    claimed_at      TIMESTAMPTZ,
    claimed_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vanity_backlog_unclaimed ON vanity_backlog(suffix, id) WHERE claimed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vanity_backlog_claimed ON vanity_backlog(claimed_at) WHERE claimed_at IS NOT NULL;

-- ═══ Referral System ═══════════════════════════════════════════════════════

-- Referral codes: each wallet gets one unique code
CREATE TABLE IF NOT EXISTS referral_codes (
    id              BIGSERIAL PRIMARY KEY,
    wallet          TEXT NOT NULL UNIQUE,
    code            TEXT NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_wallet ON referral_codes(wallet);

-- Referral attributions: who referred whom (one-time link)
CREATE TABLE IF NOT EXISTS referral_attributions (
    id              BIGSERIAL PRIMARY KEY,
    referee_wallet  TEXT NOT NULL UNIQUE,        -- the new user
    referrer_wallet TEXT NOT NULL,                -- who referred them
    referrer_code   TEXT NOT NULL,                -- code used
    tier            SMALLINT NOT NULL DEFAULT 1,  -- 1 = direct, 2 = second-degree
    attributed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_attr_referrer ON referral_attributions(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referral_attr_referee ON referral_attributions(referee_wallet);

-- Referral earnings: per-trade fee credits accrued to referrers
CREATE TABLE IF NOT EXISTS referral_earnings (
    id              BIGSERIAL PRIMARY KEY,
    referrer_wallet TEXT NOT NULL,
    referee_wallet  TEXT NOT NULL,
    launch_id       TEXT NOT NULL,
    trade_tx        TEXT NOT NULL,
    tier            SMALLINT NOT NULL DEFAULT 1,  -- 1 = direct (50%), 2 = second-degree (15%)
    fee_lamports    BIGINT NOT NULL,              -- total fee on the trade
    earned_lamports BIGINT NOT NULL,              -- referrer's share
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_trade ON referral_earnings(trade_tx);

-- Referral payouts: processed withdrawals from referral vault
CREATE TABLE IF NOT EXISTS referral_payouts (
    id              BIGSERIAL PRIMARY KEY,
    referrer_wallet TEXT NOT NULL,
    amount_lamports BIGINT NOT NULL,
    tx_signature    TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referral_payouts_wallet ON referral_payouts(referrer_wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_status ON referral_payouts(status) WHERE status != 'completed';

-- Referral anti-gaming: cooldown and rate tracking
CREATE TABLE IF NOT EXISTS referral_cooldowns (
    id              BIGSERIAL PRIMARY KEY,
    wallet          TEXT NOT NULL,
    action_type     TEXT NOT NULL,           -- 'trade', 'attribution'
    window_start    TIMESTAMPTZ NOT NULL,
    action_count    INTEGER NOT NULL DEFAULT 1,
    UNIQUE(wallet, action_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_referral_cooldowns_wallet ON referral_cooldowns(wallet, action_type, window_start DESC);
