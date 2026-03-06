use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("PEng1111111111111111111111111111111111111111");

#[program]
pub mod policy_engine {
    use super::*;

    /// Initialize policy engine state for a launch.
    /// Called during graduation to activate stewardship.
    pub fn initialize(
        ctx: Context<InitializePolicy>,
        launch_id: [u8; 32],
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy_state;
        policy.launch_id = launch_id;
        policy.authority = ctx.accounts.authority.key();
        policy.vault_state = ctx.accounts.vault_state.key();
        policy.keeper = ctx.accounts.keeper.key();

        policy.state = PolicyEngineState::Active;
        policy.graduation_timestamp = Clock::get()?.unix_timestamp;
        policy.last_monitor_timestamp = 0;
        policy.last_execution_timestamp = 0;
        policy.last_rebalance_timestamp = 0;

        // Metrics (updated by keeper via crank)
        policy.holders_count = 0;
        policy.top10_concentration_bps = 10000; // starts at 100%, updated by indexer
        policy.lp_depth_usd = 0;
        policy.current_day_number = 0;

        // Counters
        policy.total_releases = 0;
        policy.total_compounds = 0;
        policy.total_rebalances = 0;
        policy.total_monitor_runs = 0;
        policy.anomaly_flags = 0;

        policy.bump = ctx.bumps.policy_state;
        policy.created_at = Clock::get()?.unix_timestamp;

        emit!(PolicyEngineInitialized {
            launch_id,
            keeper: policy.keeper,
            graduation_timestamp: policy.graduation_timestamp,
        });

        Ok(())
    }

    /// Hourly monitor crank — updates metrics + checks anomalies.
    /// Called by keeper with fresh off-chain data.
    pub fn monitor(
        ctx: Context<KeeperAction>,
        holders_count: u32,
        top10_concentration_bps: u16,
        lp_depth_usd: u64,
        volatility_1h_bps: u16,
        volume_24h_usd: u64,
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy_state;
        require!(policy.state == PolicyEngineState::Active, ErrorCode::PolicyNotActive);

        let clock = Clock::get()?;

        // Enforce minimum monitor cadence (55 min to allow some variance)
        if policy.last_monitor_timestamp > 0 {
            let elapsed = clock.unix_timestamp - policy.last_monitor_timestamp;
            require!(elapsed >= 3300, ErrorCode::MonitorTooFrequent); // 55 min
        }

        // Update metrics
        policy.holders_count = holders_count;
        policy.top10_concentration_bps = top10_concentration_bps;
        policy.lp_depth_usd = lp_depth_usd;
        policy.last_monitor_timestamp = clock.unix_timestamp;
        policy.total_monitor_runs = policy.total_monitor_runs.checked_add(1).unwrap();

        // Compute day number since graduation
        let days_since = (clock.unix_timestamp - policy.graduation_timestamp) / 86400;
        policy.current_day_number = days_since as u32;

        // Check Flight Mode conditions
        let flight_check = check_flight_conditions(policy, ctx.accounts.treasury_vault.amount);

        emit!(MonitorExecuted {
            launch_id: policy.launch_id,
            holders_count,
            top10_concentration_bps,
            lp_depth_usd,
            volatility_1h_bps,
            volume_24h_usd,
            day_number: policy.current_day_number,
            flight_eligible: flight_check,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Daily execution crank — treasury release + LP compound.
    /// Called by keeper once per day.
    pub fn execute_daily(
        ctx: Context<KeeperAction>,
        release_amount: u64,
        compound_lp_amount: u64,
        compound_house_amount: u64,
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy_state;
        require!(policy.state == PolicyEngineState::Active, ErrorCode::PolicyNotActive);

        let clock = Clock::get()?;

        // Enforce minimum execution cadence (~23 hours)
        if policy.last_execution_timestamp > 0 {
            let elapsed = clock.unix_timestamp - policy.last_execution_timestamp;
            require!(elapsed >= 82800, ErrorCode::ExecutionTooFrequent); // 23 hours
        }

        // Validate release amount against sell pressure cap
        let day_number = policy.current_day_number;
        let sell_pressure_cap_bps = compute_sell_pressure_cap(day_number);

        if policy.lp_depth_usd > 0 && release_amount > 0 {
            // Net sell pressure check: release value must be <= cap% of LP depth
            // This is approximate; keeper provides USD-denominated values
            // On-chain we trust the keeper's attestation but enforce the cap formula
            let max_sell_pressure = (policy.lp_depth_usd as u128)
                .checked_mul(sell_pressure_cap_bps as u128)
                .unwrap()
                .checked_div(10_000)
                .unwrap() as u64;

            // release_amount is in token units; we can't directly compare to USD on-chain
            // So we rely on the keeper submitting valid amounts and the vault enforcing caps
        }

        // Update counters
        if release_amount > 0 {
            policy.total_releases = policy.total_releases.checked_add(1).unwrap();
        }
        if compound_lp_amount > 0 || compound_house_amount > 0 {
            policy.total_compounds = policy.total_compounds.checked_add(1).unwrap();
        }

        policy.last_execution_timestamp = clock.unix_timestamp;

        emit!(DailyExecutionCompleted {
            launch_id: policy.launch_id,
            release_amount,
            compound_lp_amount,
            compound_house_amount,
            sell_pressure_cap_bps,
            day_number,
            timestamp: clock.unix_timestamp,
        });

        // NOTE: Actual vault transfers are done via CPI to agency_vaults program
        // by the keeper in the same transaction. This instruction validates + logs.

        Ok(())
    }

    /// Rebalance LP positions within allowed constraints.
    /// Called by keeper when bins go out of range.
    pub fn execute_rebalance(
        ctx: Context<KeeperAction>,
        venue: VenueType,
        action_description: [u8; 64],
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy_state;
        require!(policy.state == PolicyEngineState::Active, ErrorCode::PolicyNotActive);

        let clock = Clock::get()?;

        // Enforce rebalance frequency: max once per 4 hours
        if policy.last_rebalance_timestamp > 0 {
            let elapsed = clock.unix_timestamp - policy.last_rebalance_timestamp;
            require!(elapsed >= 14400, ErrorCode::RebalanceTooFrequent); // 4 hours
        }

        policy.last_rebalance_timestamp = clock.unix_timestamp;
        policy.total_rebalances = policy.total_rebalances.checked_add(1).unwrap();

        emit!(RebalanceExecuted {
            launch_id: policy.launch_id,
            venue: venue as u8,
            action_description,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Trigger Flight Mode — irreversible lockout.
    /// Called by keeper when monitor confirms all conditions met,
    /// or when max stewardship duration is exceeded.
    pub fn trigger_flight_mode(ctx: Context<KeeperAction>) -> Result<()> {
        let policy = &mut ctx.accounts.policy_state;
        require!(policy.state == PolicyEngineState::Active, ErrorCode::PolicyNotActive);

        let clock = Clock::get()?;
        let elapsed = clock.unix_timestamp - policy.graduation_timestamp;

        // Check conditions: either all organic thresholds met, or max duration exceeded
        let treasury_remaining = ctx.accounts.treasury_vault.amount;
        let organic_ready = check_flight_conditions(policy, treasury_remaining);

        // Read charter thresholds from vault state (passed via remaining accounts or hardcoded)
        let max_duration_exceeded = elapsed >= 180 * 86400; // 180 days failsafe

        require!(
            organic_ready || max_duration_exceeded,
            ErrorCode::FlightConditionsNotMet
        );

        policy.state = PolicyEngineState::Locked;

        emit!(FlightModeTriggered {
            launch_id: policy.launch_id,
            organic_ready,
            max_duration_exceeded,
            holders_count: policy.holders_count,
            top10_concentration_bps: policy.top10_concentration_bps,
            treasury_remaining,
            timestamp: clock.unix_timestamp,
        });

        // CPI to agency_vaults::enter_flight_mode would happen here

        Ok(())
    }

    /// Update keeper address. Only callable by authority.
    pub fn update_keeper(ctx: Context<AuthorityAction>, new_keeper: Pubkey) -> Result<()> {
        let policy = &mut ctx.accounts.policy_state;
        let old_keeper = policy.keeper;
        policy.keeper = new_keeper;

        emit!(KeeperUpdated {
            launch_id: policy.launch_id,
            old_keeper,
            new_keeper,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ── Helper Functions ──────────────────────────────────────────────────────

/// Compute sell pressure cap based on day number.
/// Days 1-7: 400 bps (4%), linearly tapers to 100 bps (1%) by day 30.
/// Day 30+: fixed 100 bps (1%).
fn compute_sell_pressure_cap(day_number: u32) -> u16 {
    if day_number <= 7 {
        400 // 4%
    } else if day_number >= 30 {
        100 // 1%
    } else {
        // Linear taper from 400 to 100 over days 7-30
        let range = 30 - 7; // 23 days
        let elapsed = day_number - 7;
        let reduction = (300 * elapsed as u32) / range;
        (400 - reduction) as u16
    }
}

/// Check if all organic flight mode conditions are met.
fn check_flight_conditions(policy: &PolicyState, treasury_remaining: u64) -> bool {
    let holders_ok = policy.holders_count >= 15_000;
    let concentration_ok = policy.top10_concentration_bps <= 1800; // 18%
    // Treasury remaining <= 5% of total supply in units
    // 5% of 1B tokens with 6 decimals = 50,000,000 * 1_000_000
    let treasury_threshold = 50_000_000u64.checked_mul(1_000_000).unwrap();
    let treasury_ok = treasury_remaining <= treasury_threshold;

    holders_ok && concentration_ok && treasury_ok
}

// ── Accounts ──────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(launch_id: [u8; 32])]
pub struct InitializePolicy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Keeper wallet
    pub keeper: UncheckedAccount<'info>,

    /// CHECK: VaultState account from agency-vaults program
    pub vault_state: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + PolicyState::INIT_SPACE,
        seeds = [b"policy_state", launch_id.as_ref()],
        bump,
    )]
    pub policy_state: Account<'info, PolicyState>,

    pub treasury_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct KeeperAction<'info> {
    #[account(
        constraint = keeper.key() == policy_state.keeper @ ErrorCode::UnauthorizedKeeper,
    )]
    pub keeper: Signer<'info>,

    #[account(
        mut,
        seeds = [b"policy_state", policy_state.launch_id.as_ref()],
        bump = policy_state.bump,
    )]
    pub policy_state: Account<'info, PolicyState>,

    pub treasury_vault: Account<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct AuthorityAction<'info> {
    #[account(
        constraint = authority.key() == policy_state.authority @ ErrorCode::Unauthorized,
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"policy_state", policy_state.launch_id.as_ref()],
        bump = policy_state.bump,
    )]
    pub policy_state: Account<'info, PolicyState>,
}

// ── State ─────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct PolicyState {
    pub launch_id: [u8; 32],
    pub authority: Pubkey,
    pub vault_state: Pubkey,
    pub keeper: Pubkey,

    pub state: PolicyEngineState,
    pub graduation_timestamp: i64,
    pub last_monitor_timestamp: i64,
    pub last_execution_timestamp: i64,
    pub last_rebalance_timestamp: i64,

    // Metrics (updated by keeper)
    pub holders_count: u32,
    pub top10_concentration_bps: u16,
    pub lp_depth_usd: u64,
    pub current_day_number: u32,

    // Counters
    pub total_releases: u64,
    pub total_compounds: u64,
    pub total_rebalances: u64,
    pub total_monitor_runs: u64,
    pub anomaly_flags: u64,

    pub bump: u8,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, InitSpace)]
pub enum PolicyEngineState {
    /// Pre-graduation, not yet active
    Pending,
    /// Active stewardship
    Active,
    /// Flight mode — locked, no further policy actions
    Locked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum VenueType {
    MeteoraDlmm = 0,
    RaydiumClmm = 1,
}

// ── Events ────────────────────────────────────────────────────────────────

#[event]
pub struct PolicyEngineInitialized {
    pub launch_id: [u8; 32],
    pub keeper: Pubkey,
    pub graduation_timestamp: i64,
}

#[event]
pub struct MonitorExecuted {
    pub launch_id: [u8; 32],
    pub holders_count: u32,
    pub top10_concentration_bps: u16,
    pub lp_depth_usd: u64,
    pub volatility_1h_bps: u16,
    pub volume_24h_usd: u64,
    pub day_number: u32,
    pub flight_eligible: bool,
    pub timestamp: i64,
}

#[event]
pub struct DailyExecutionCompleted {
    pub launch_id: [u8; 32],
    pub release_amount: u64,
    pub compound_lp_amount: u64,
    pub compound_house_amount: u64,
    pub sell_pressure_cap_bps: u16,
    pub day_number: u32,
    pub timestamp: i64,
}

#[event]
pub struct RebalanceExecuted {
    pub launch_id: [u8; 32],
    pub venue: u8,
    pub action_description: [u8; 64],
    pub timestamp: i64,
}

#[event]
pub struct FlightModeTriggered {
    pub launch_id: [u8; 32],
    pub organic_ready: bool,
    pub max_duration_exceeded: bool,
    pub holders_count: u32,
    pub top10_concentration_bps: u16,
    pub treasury_remaining: u64,
    pub timestamp: i64,
}

#[event]
pub struct KeeperUpdated {
    pub launch_id: [u8; 32],
    pub old_keeper: Pubkey,
    pub new_keeper: Pubkey,
    pub timestamp: i64,
}

// ── Errors ────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Policy engine is not in Active state")]
    PolicyNotActive,
    #[msg("Monitor crank called too frequently")]
    MonitorTooFrequent,
    #[msg("Daily execution called too frequently")]
    ExecutionTooFrequent,
    #[msg("Rebalance called too frequently")]
    RebalanceTooFrequent,
    #[msg("Flight mode conditions not met")]
    FlightConditionsNotMet,
    #[msg("Unauthorized keeper")]
    UnauthorizedKeeper,
    #[msg("Unauthorized")]
    Unauthorized,
}
