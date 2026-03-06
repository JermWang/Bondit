use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("AVlt1111111111111111111111111111111111111111");

pub mod constants {
    /// Agency treasury allocation: 150M tokens (15%)
    pub const AGENCY_TREASURY: u64 = 150_000_000;
    /// LP reserve allocation: 50M tokens (5%)
    pub const LP_RESERVE: u64 = 50_000_000;
    /// Token decimals
    pub const TOKEN_DECIMALS: u8 = 6;
    /// Treasury in smallest units
    pub const AGENCY_TREASURY_UNITS: u64 = AGENCY_TREASURY * 1_000_000;
    /// LP reserve in smallest units
    pub const LP_RESERVE_UNITS: u64 = LP_RESERVE * 1_000_000;
}

#[program]
pub mod agency_vaults {
    use super::*;

    /// Initialize the Agency Vault system for a launch.
    /// Creates Treasury, LP Reserve, Fee Accumulator, and House vault state.
    pub fn initialize(
        ctx: Context<InitializeVaults>,
        launch_id: [u8; 32],
        charter: Charter,
    ) -> Result<()> {
        let vaults = &mut ctx.accounts.vault_state;
        vaults.launch_id = launch_id;
        vaults.mint = ctx.accounts.mint.key();
        vaults.authority = ctx.accounts.authority.key();
        vaults.policy_engine = ctx.accounts.policy_engine.key();

        // Vault addresses
        vaults.treasury_vault = ctx.accounts.treasury_vault.key();
        vaults.lp_reserve_vault = ctx.accounts.lp_reserve_vault.key();
        vaults.fee_accumulator_sol = ctx.accounts.fee_accumulator_sol.key();
        vaults.house_vault_sol = ctx.accounts.house_vault_sol.key();

        // Charter (immutable after init)
        vaults.charter = charter;

        // Tracking
        vaults.treasury_released_total = 0;
        vaults.treasury_released_today = 0;
        vaults.treasury_released_this_week = 0;
        vaults.last_release_day = 0;
        vaults.last_release_week = 0;
        vaults.lp_fees_compounded = 0;
        vaults.house_fees_collected = 0;
        vaults.policy_actions_count = 0;
        vaults.is_flight_mode = false;
        vaults.flight_mode_timestamp = 0;
        vaults.is_paused = false;
        vaults.created_at = Clock::get()?.unix_timestamp;
        vaults.bump = ctx.bumps.vault_state;

        emit!(VaultsInitialized {
            launch_id,
            mint: vaults.mint,
            treasury_vault: vaults.treasury_vault,
            lp_reserve_vault: vaults.lp_reserve_vault,
            charter_hash: vaults.charter.compute_hash(),
        });

        Ok(())
    }

    /// Release tokens from treasury according to policy constraints.
    /// Only callable by PolicyEngine PDA.
    pub fn treasury_release(
        ctx: Context<PolicyAction>,
        amount: u64,
        destination: ReleaseDestination,
    ) -> Result<()> {
        let vaults = &mut ctx.accounts.vault_state;
        require!(!vaults.is_paused, ErrorCode::SystemPaused);
        require!(!vaults.is_flight_mode, ErrorCode::FlightModeActive);

        let clock = Clock::get()?;
        let current_day = clock.unix_timestamp / 86400;
        let current_week = clock.unix_timestamp / 604800;

        // Reset daily counter if new day
        if current_day != vaults.last_release_day {
            vaults.treasury_released_today = 0;
            vaults.last_release_day = current_day;
        }

        // Reset weekly counter if new week
        if current_week != vaults.last_release_week {
            vaults.treasury_released_this_week = 0;
            vaults.last_release_week = current_week;
        }

        // Enforce daily cap: MAX_DAILY_RELEASE = 1,000,000 tokens (in units)
        let max_daily = vaults.charter.max_daily_release_units;
        require!(
            vaults.treasury_released_today.checked_add(amount).unwrap() <= max_daily,
            ErrorCode::DailyReleaseLimitExceeded
        );

        // Enforce weekly cap: MAX_WEEKLY_RELEASE = 5,000,000 tokens (in units)
        let max_weekly = vaults.charter.max_weekly_release_units;
        require!(
            vaults.treasury_released_this_week.checked_add(amount).unwrap() <= max_weekly,
            ErrorCode::WeeklyReleaseLimitExceeded
        );

        // Enforce exponential decay: release <= treasury_remaining * daily_rate
        let treasury_balance = ctx.accounts.treasury_vault.amount;
        let max_decay_release = treasury_balance
            .checked_mul(vaults.charter.daily_release_rate_bps as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();
        require!(amount <= max_decay_release, ErrorCode::ExceedsDecaySchedule);

        // Transfer tokens from treasury vault
        let seeds = &[
            b"vault_state",
            vaults.launch_id.as_ref(),
            &[vaults.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let destination_account = match destination {
            ReleaseDestination::LpReserve => ctx.accounts.destination_token_account.to_account_info(),
            ReleaseDestination::Distribution => ctx.accounts.destination_token_account.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury_vault.to_account_info(),
                    to: destination_account,
                    authority: ctx.accounts.vault_state.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Update tracking
        vaults.treasury_released_total = vaults.treasury_released_total.checked_add(amount).unwrap();
        vaults.treasury_released_today = vaults.treasury_released_today.checked_add(amount).unwrap();
        vaults.treasury_released_this_week = vaults.treasury_released_this_week.checked_add(amount).unwrap();
        vaults.policy_actions_count = vaults.policy_actions_count.checked_add(1).unwrap();

        emit!(TreasuryReleased {
            launch_id: vaults.launch_id,
            amount,
            destination: destination as u8,
            treasury_remaining: ctx.accounts.treasury_vault.amount.checked_sub(amount).unwrap(),
            action_index: vaults.policy_actions_count,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Record LP fee compounding action.
    /// Only callable by PolicyEngine PDA.
    pub fn record_compound(
        ctx: Context<PolicyAction>,
        lp_amount: u64,
        house_amount: u64,
    ) -> Result<()> {
        let vaults = &mut ctx.accounts.vault_state;
        require!(!vaults.is_paused, ErrorCode::SystemPaused);
        require!(!vaults.is_flight_mode || !vaults.charter.house_fee_ends_at_flight, ErrorCode::FlightModeActive);

        vaults.lp_fees_compounded = vaults.lp_fees_compounded.checked_add(lp_amount).unwrap();
        vaults.house_fees_collected = vaults.house_fees_collected.checked_add(house_amount).unwrap();
        vaults.policy_actions_count = vaults.policy_actions_count.checked_add(1).unwrap();

        emit!(CompoundRecorded {
            launch_id: vaults.launch_id,
            lp_amount,
            house_amount,
            total_compounded: vaults.lp_fees_compounded,
            total_house: vaults.house_fees_collected,
            action_index: vaults.policy_actions_count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Enter Flight Mode — irreversible.
    /// Only callable by PolicyEngine PDA when all conditions are met.
    pub fn enter_flight_mode(ctx: Context<PolicyAction>) -> Result<()> {
        let vaults = &mut ctx.accounts.vault_state;
        require!(!vaults.is_flight_mode, ErrorCode::FlightModeActive);

        vaults.is_flight_mode = true;
        vaults.flight_mode_timestamp = Clock::get()?.unix_timestamp;
        vaults.policy_actions_count = vaults.policy_actions_count.checked_add(1).unwrap();

        emit!(FlightModeActivated {
            launch_id: vaults.launch_id,
            timestamp: vaults.flight_mode_timestamp,
            treasury_remaining: ctx.accounts.treasury_vault.amount,
            action_index: vaults.policy_actions_count,
        });

        Ok(())
    }

    /// Emergency circuit breaker — pause policy execution.
    /// Only callable by multisig authority.
    pub fn emergency_pause(ctx: Context<EmergencyAction>) -> Result<()> {
        let vaults = &mut ctx.accounts.vault_state;
        require!(!vaults.is_paused, ErrorCode::AlreadyPaused);

        vaults.is_paused = true;
        vaults.policy_actions_count = vaults.policy_actions_count.checked_add(1).unwrap();

        emit!(EmergencyPaused {
            launch_id: vaults.launch_id,
            paused_by: ctx.accounts.multisig_signer.key(),
            timestamp: Clock::get()?.unix_timestamp,
            action_index: vaults.policy_actions_count,
        });

        Ok(())
    }

    /// Unpause after emergency review.
    /// Only callable by multisig authority.
    pub fn emergency_unpause(ctx: Context<EmergencyAction>) -> Result<()> {
        let vaults = &mut ctx.accounts.vault_state;
        require!(vaults.is_paused, ErrorCode::NotPaused);

        vaults.is_paused = false;
        vaults.policy_actions_count = vaults.policy_actions_count.checked_add(1).unwrap();

        emit!(EmergencyUnpaused {
            launch_id: vaults.launch_id,
            unpaused_by: ctx.accounts.multisig_signer.key(),
            timestamp: Clock::get()?.unix_timestamp,
            action_index: vaults.policy_actions_count,
        });

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(launch_id: [u8; 32])]
pub struct InitializeVaults<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    /// CHECK: PolicyEngine program or PDA
    pub policy_engine: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + VaultState::INIT_SPACE,
        seeds = [b"vault_state", launch_id.as_ref()],
        bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault_state,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault_state,
    )]
    pub lp_reserve_vault: Account<'info, TokenAccount>,

    /// CHECK: Fee accumulator SOL PDA
    #[account(mut)]
    pub fee_accumulator_sol: SystemAccount<'info>,

    /// CHECK: House vault SOL PDA
    #[account(mut)]
    pub house_vault_sol: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PolicyAction<'info> {
    /// PolicyEngine PDA — only authorized caller
    pub policy_signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", vault_state.launch_id.as_ref()],
        bump = vault_state.bump,
        has_one = policy_engine,
    )]
    pub vault_state: Account<'info, VaultState>,

    /// CHECK: Must match vault_state.policy_engine
    pub policy_engine: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault_state,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    /// Destination token account for released tokens
    #[account(mut)]
    pub destination_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EmergencyAction<'info> {
    pub multisig_signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault_state", vault_state.launch_id.as_ref()],
        bump = vault_state.bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault_state,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    /// Placeholder: not used in emergency but required by struct
    #[account(mut)]
    pub destination_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

// ── State ─────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub launch_id: [u8; 32],
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub policy_engine: Pubkey,

    // Vault addresses
    pub treasury_vault: Pubkey,
    pub lp_reserve_vault: Pubkey,
    pub fee_accumulator_sol: Pubkey,
    pub house_vault_sol: Pubkey,

    // Charter (immutable post-init)
    pub charter: Charter,

    // Tracking
    pub treasury_released_total: u64,
    pub treasury_released_today: u64,
    pub treasury_released_this_week: u64,
    pub last_release_day: i64,
    pub last_release_week: i64,
    pub lp_fees_compounded: u64,
    pub house_fees_collected: u64,
    pub policy_actions_count: u64,

    // Flight mode
    pub is_flight_mode: bool,
    pub flight_mode_timestamp: i64,

    // Emergency
    pub is_paused: bool,

    pub created_at: i64,
    pub bump: u8,
}

/// Immutable Agency Charter — set at launch, never modified.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Charter {
    /// Daily release rate in basis points (20 = 0.20%)
    pub daily_release_rate_bps: u16,
    /// Max daily release in token units
    pub max_daily_release_units: u64,
    /// Max weekly release in token units
    pub max_weekly_release_units: u64,
    /// Sell pressure cap day 1-7 in bps of LP depth (400 = 4%)
    pub sell_pressure_cap_early_bps: u16,
    /// Sell pressure cap day 30+ in bps of LP depth (100 = 1%)
    pub sell_pressure_cap_mature_bps: u16,
    /// Flight mode: min holders
    pub flight_holders_threshold: u32,
    /// Flight mode: max top-10 concentration bps (1800 = 18%)
    pub flight_top10_concentration_bps: u16,
    /// Flight mode: max treasury remaining bps (500 = 5%)
    pub flight_treasury_remaining_bps: u16,
    /// Max stewardship duration in seconds
    pub max_stewardship_duration: i64,
    /// Whether house fee stops at flight mode
    pub house_fee_ends_at_flight: bool,
    /// Fee split LP bps (9900 = 99%)
    pub fee_split_lp_bps: u16,
    /// Fee split house bps (100 = 1%)
    pub fee_split_house_bps: u16,
}

impl Charter {
    pub fn compute_hash(&self) -> [u8; 32] {
        let data = self.try_to_vec().unwrap();
        anchor_lang::solana_program::hash::hash(&data).to_bytes()
    }

    /// Create default charter matching spec parameters
    pub fn default_charter() -> Self {
        Charter {
            daily_release_rate_bps: 20,             // 0.20%
            max_daily_release_units: 1_000_000 * 1_000_000, // 1M tokens w/ 6 decimals
            max_weekly_release_units: 5_000_000 * 1_000_000, // 5M tokens w/ 6 decimals
            sell_pressure_cap_early_bps: 400,       // 4%
            sell_pressure_cap_mature_bps: 100,      // 1%
            flight_holders_threshold: 15_000,
            flight_top10_concentration_bps: 1800,   // 18%
            flight_treasury_remaining_bps: 500,     // 5%
            max_stewardship_duration: 180 * 86400,  // 180 days
            house_fee_ends_at_flight: true,
            fee_split_lp_bps: 9900,                 // 99%
            fee_split_house_bps: 100,               // 1%
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ReleaseDestination {
    LpReserve = 0,
    Distribution = 1,
}

// ── Events ────────────────────────────────────────────────────────────────

#[event]
pub struct VaultsInitialized {
    pub launch_id: [u8; 32],
    pub mint: Pubkey,
    pub treasury_vault: Pubkey,
    pub lp_reserve_vault: Pubkey,
    pub charter_hash: [u8; 32],
}

#[event]
pub struct TreasuryReleased {
    pub launch_id: [u8; 32],
    pub amount: u64,
    pub destination: u8,
    pub treasury_remaining: u64,
    pub action_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct CompoundRecorded {
    pub launch_id: [u8; 32],
    pub lp_amount: u64,
    pub house_amount: u64,
    pub total_compounded: u64,
    pub total_house: u64,
    pub action_index: u64,
    pub timestamp: i64,
}

#[event]
pub struct FlightModeActivated {
    pub launch_id: [u8; 32],
    pub timestamp: i64,
    pub treasury_remaining: u64,
    pub action_index: u64,
}

#[event]
pub struct EmergencyPaused {
    pub launch_id: [u8; 32],
    pub paused_by: Pubkey,
    pub timestamp: i64,
    pub action_index: u64,
}

#[event]
pub struct EmergencyUnpaused {
    pub launch_id: [u8; 32],
    pub unpaused_by: Pubkey,
    pub timestamp: i64,
    pub action_index: u64,
}

// ── Errors ────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("System is paused via circuit breaker")]
    SystemPaused,
    #[msg("Flight mode is active — no further policy actions")]
    FlightModeActive,
    #[msg("Daily release limit exceeded")]
    DailyReleaseLimitExceeded,
    #[msg("Weekly release limit exceeded")]
    WeeklyReleaseLimitExceeded,
    #[msg("Release exceeds exponential decay schedule")]
    ExceedsDecaySchedule,
    #[msg("System is already paused")]
    AlreadyPaused,
    #[msg("System is not paused")]
    NotPaused,
    #[msg("Unauthorized caller")]
    Unauthorized,
}
