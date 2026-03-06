use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

declare_id!("VAdp1111111111111111111111111111111111111111");

#[program]
pub mod venue_adapters {
    use super::*;

    /// Initialize adapter state for a launch.
    /// Registers which venue(s) are active and stores position references.
    pub fn initialize(
        ctx: Context<InitializeAdapter>,
        launch_id: [u8; 32],
        primary_venue: VenueType,
    ) -> Result<()> {
        let adapter = &mut ctx.accounts.adapter_state;
        adapter.launch_id = launch_id;
        adapter.policy_engine = ctx.accounts.policy_engine.key();
        adapter.keeper = ctx.accounts.keeper.key();
        adapter.primary_venue = primary_venue;
        adapter.pool_address = Pubkey::default();
        adapter.position_address = Pubkey::default();
        adapter.is_pool_created = false;
        adapter.is_position_active = false;
        adapter.total_liquidity_added_sol = 0;
        adapter.total_liquidity_added_tokens = 0;
        adapter.total_fees_harvested_sol = 0;
        adapter.total_fees_harvested_tokens = 0;
        adapter.total_rebalances = 0;
        adapter.last_action_timestamp = 0;
        adapter.bump = ctx.bumps.adapter_state;
        adapter.created_at = Clock::get()?.unix_timestamp;

        emit!(AdapterInitialized {
            launch_id,
            primary_venue: primary_venue as u8,
            policy_engine: adapter.policy_engine,
        });

        Ok(())
    }

    /// Create a liquidity pool on the primary venue.
    /// Called post-graduation to seed initial liquidity.
    /// Only callable by authorized keeper via PolicyEngine validation.
    pub fn create_pool(
        ctx: Context<AdapterAction>,
        initial_price: u64,
        bin_step: u16,
        active_id: i32,
    ) -> Result<()> {
        let adapter = &mut ctx.accounts.adapter_state;
        require!(!adapter.is_pool_created, ErrorCode::PoolAlreadyCreated);

        // In production, this would CPI into Meteora DLMM or Raydium CLMM
        // For now, we record the intent and store the pool parameters

        adapter.is_pool_created = true;
        adapter.last_action_timestamp = Clock::get()?.unix_timestamp;

        emit!(PoolCreated {
            launch_id: adapter.launch_id,
            venue: adapter.primary_venue as u8,
            initial_price,
            bin_step,
            active_id,
            timestamp: adapter.last_action_timestamp,
        });

        // NOTE: Actual Meteora DLMM CPI would be:
        // meteora_dlmm::cpi::initialize_pool(...)
        // The pool_address and position_address would be set from CPI return data.

        Ok(())
    }

    /// Add liquidity to the pool position.
    /// Called during seeding and daily compounding.
    pub fn add_liquidity(
        ctx: Context<AdapterAction>,
        sol_amount: u64,
        token_amount: u64,
        strategy: LiquidityStrategy,
    ) -> Result<()> {
        let adapter = &mut ctx.accounts.adapter_state;
        require!(adapter.is_pool_created, ErrorCode::PoolNotCreated);

        // Rate limit: max 1 add per hour
        let clock = Clock::get()?;
        if adapter.last_action_timestamp > 0 {
            let elapsed = clock.unix_timestamp - adapter.last_action_timestamp;
            require!(elapsed >= 3600, ErrorCode::ActionTooFrequent);
        }

        // In production: CPI to Meteora DLMM add_liquidity or Raydium CLMM increase_liquidity
        // With strategy determining bin distribution:
        // - Curve: concentrated near current price
        // - Flat: even across range
        // - BidAsk: heavier on one side

        adapter.total_liquidity_added_sol = adapter.total_liquidity_added_sol
            .checked_add(sol_amount).unwrap();
        adapter.total_liquidity_added_tokens = adapter.total_liquidity_added_tokens
            .checked_add(token_amount).unwrap();
        adapter.is_position_active = true;
        adapter.last_action_timestamp = clock.unix_timestamp;

        emit!(LiquidityAdded {
            launch_id: adapter.launch_id,
            venue: adapter.primary_venue as u8,
            sol_amount,
            token_amount,
            strategy: strategy as u8,
            total_sol: adapter.total_liquidity_added_sol,
            total_tokens: adapter.total_liquidity_added_tokens,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Harvest fees from LP position.
    /// Called daily by keeper as part of compounding cycle.
    pub fn harvest_fees(
        ctx: Context<AdapterAction>,
    ) -> Result<()> {
        let adapter = &mut ctx.accounts.adapter_state;
        require!(adapter.is_position_active, ErrorCode::NoActivePosition);

        let clock = Clock::get()?;

        // In production: CPI to Meteora DLMM claim_fee or Raydium CLMM collect_fees
        // Returns harvested SOL and token amounts

        // Placeholder: actual amounts would come from CPI return
        adapter.last_action_timestamp = clock.unix_timestamp;

        emit!(FeesHarvested {
            launch_id: adapter.launch_id,
            venue: adapter.primary_venue as u8,
            total_harvested_sol: adapter.total_fees_harvested_sol,
            total_harvested_tokens: adapter.total_fees_harvested_tokens,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Rebalance LP position bins/ranges.
    /// Removes liquidity from out-of-range bins and adds to active range.
    pub fn rebalance(
        ctx: Context<AdapterAction>,
        new_lower_bin: i32,
        new_upper_bin: i32,
    ) -> Result<()> {
        let adapter = &mut ctx.accounts.adapter_state;
        require!(adapter.is_position_active, ErrorCode::NoActivePosition);

        let clock = Clock::get()?;

        // Rate limit: max 1 rebalance per 4 hours (enforced by PolicyEngine too)
        if adapter.last_action_timestamp > 0 {
            let elapsed = clock.unix_timestamp - adapter.last_action_timestamp;
            require!(elapsed >= 14400, ErrorCode::ActionTooFrequent);
        }

        // In production: CPI to remove_liquidity from old bins + add_liquidity to new bins
        // Meteora DLMM: remove_liquidity + add_liquidity_by_strategy
        // Raydium CLMM: decrease_liquidity + increase_liquidity

        adapter.total_rebalances = adapter.total_rebalances.checked_add(1).unwrap();
        adapter.last_action_timestamp = clock.unix_timestamp;

        emit!(PositionRebalanced {
            launch_id: adapter.launch_id,
            venue: adapter.primary_venue as u8,
            new_lower_bin,
            new_upper_bin,
            total_rebalances: adapter.total_rebalances,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(launch_id: [u8; 32])]
pub struct InitializeAdapter<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: PolicyEngine PDA
    pub policy_engine: UncheckedAccount<'info>,

    /// CHECK: Keeper wallet
    pub keeper: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + AdapterState::INIT_SPACE,
        seeds = [b"adapter_state", launch_id.as_ref()],
        bump,
    )]
    pub adapter_state: Account<'info, AdapterState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdapterAction<'info> {
    /// Must be the authorized keeper
    #[account(
        constraint = keeper.key() == adapter_state.keeper @ ErrorCode::UnauthorizedKeeper,
    )]
    pub keeper: Signer<'info>,

    #[account(
        mut,
        seeds = [b"adapter_state", adapter_state.launch_id.as_ref()],
        bump = adapter_state.bump,
    )]
    pub adapter_state: Account<'info, AdapterState>,
}

// ── State ─────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct AdapterState {
    pub launch_id: [u8; 32],
    pub policy_engine: Pubkey,
    pub keeper: Pubkey,
    pub primary_venue: VenueType,

    // Pool/Position references
    pub pool_address: Pubkey,
    pub position_address: Pubkey,
    pub is_pool_created: bool,
    pub is_position_active: bool,

    // Cumulative tracking
    pub total_liquidity_added_sol: u64,
    pub total_liquidity_added_tokens: u64,
    pub total_fees_harvested_sol: u64,
    pub total_fees_harvested_tokens: u64,
    pub total_rebalances: u64,

    pub last_action_timestamp: i64,
    pub bump: u8,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, InitSpace)]
pub enum VenueType {
    MeteoraDlmm = 0,
    RaydiumClmm = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum LiquidityStrategy {
    /// Concentrated curve near current price (default)
    Curve = 0,
    /// Even distribution across range
    Flat = 1,
    /// Heavier on bid side (support)
    BidAsk = 2,
}

// ── Events ────────────────────────────────────────────────────────────────

#[event]
pub struct AdapterInitialized {
    pub launch_id: [u8; 32],
    pub primary_venue: u8,
    pub policy_engine: Pubkey,
}

#[event]
pub struct PoolCreated {
    pub launch_id: [u8; 32],
    pub venue: u8,
    pub initial_price: u64,
    pub bin_step: u16,
    pub active_id: i32,
    pub timestamp: i64,
}

#[event]
pub struct LiquidityAdded {
    pub launch_id: [u8; 32],
    pub venue: u8,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub strategy: u8,
    pub total_sol: u64,
    pub total_tokens: u64,
    pub timestamp: i64,
}

#[event]
pub struct FeesHarvested {
    pub launch_id: [u8; 32],
    pub venue: u8,
    pub total_harvested_sol: u64,
    pub total_harvested_tokens: u64,
    pub timestamp: i64,
}

#[event]
pub struct PositionRebalanced {
    pub launch_id: [u8; 32],
    pub venue: u8,
    pub new_lower_bin: i32,
    pub new_upper_bin: i32,
    pub total_rebalances: u64,
    pub timestamp: i64,
}

// ── Errors ────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Pool already created")]
    PoolAlreadyCreated,
    #[msg("Pool not yet created")]
    PoolNotCreated,
    #[msg("No active LP position")]
    NoActivePosition,
    #[msg("Action called too frequently")]
    ActionTooFrequent,
    #[msg("Unauthorized keeper")]
    UnauthorizedKeeper,
}
