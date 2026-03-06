use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("LFac1111111111111111111111111111111111111111");

pub mod constants {
    pub const TOTAL_SUPPLY: u64 = 1_000_000_000;
    pub const CURVE_SUPPLY: u64 = 800_000_000;
    pub const AGENCY_TREASURY: u64 = 150_000_000;
    pub const LP_RESERVE: u64 = 50_000_000;
    pub const TOKEN_DECIMALS: u8 = 6;
    pub const TOTAL_SUPPLY_UNITS: u64 = TOTAL_SUPPLY * 1_000_000;
    pub const CURVE_SUPPLY_UNITS: u64 = CURVE_SUPPLY * 1_000_000;
    pub const AGENCY_TREASURY_UNITS: u64 = AGENCY_TREASURY * 1_000_000;
    pub const LP_RESERVE_UNITS: u64 = LP_RESERVE * 1_000_000;
}

#[program]
pub mod launch_factory {
    use super::*;

    /// Create a new token launch with Agency stewardship.
    /// This is the genesis event: creates token, mints supply, allocates to vaults.
    pub fn create_launch(
        ctx: Context<CreateLaunch>,
        launch_id: [u8; 32],
        name: String,
        symbol: String,
        uri: String,
        launch_mode: LaunchMode,
    ) -> Result<()> {
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
        require!(uri.len() <= 200, ErrorCode::UriTooLong);

        let launch = &mut ctx.accounts.launch_state;
        launch.launch_id = launch_id;
        launch.creator = ctx.accounts.creator.key();
        launch.mint = ctx.accounts.mint.key();
        launch.launch_mode = launch_mode;

        // Program addresses
        launch.curve_state = ctx.accounts.curve_state.key();
        launch.vault_state = ctx.accounts.vault_state.key();
        launch.policy_state = Pubkey::default(); // Set during graduation
        launch.adapter_state = Pubkey::default(); // Set during graduation

        // Vault token accounts
        launch.curve_token_vault = ctx.accounts.curve_token_vault.key();
        launch.treasury_vault = ctx.accounts.treasury_vault.key();
        launch.lp_reserve_vault = ctx.accounts.lp_reserve_vault.key();

        // Status
        launch.status = LaunchStatus::CurveActive;
        launch.created_at = Clock::get()?.unix_timestamp;
        launch.graduated_at = 0;
        launch.flight_mode_at = 0;

        // Metadata
        launch.name = name.clone();
        launch.symbol = symbol.clone();
        launch.uri = uri.clone();

        launch.bump = ctx.bumps.launch_state;
        launch.mint_bump = ctx.bumps.mint;

        // Mint total supply to the launch_state PDA (temporary authority)
        let seeds = &[
            b"launch_state",
            launch_id.as_ref(),
            &[launch.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Mint entire supply
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.curve_token_vault.to_account_info(),
                    authority: ctx.accounts.launch_state.to_account_info(),
                },
                signer_seeds,
            ),
            constants::CURVE_SUPPLY_UNITS,
        )?;

        // Mint treasury allocation
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.treasury_vault.to_account_info(),
                    authority: ctx.accounts.launch_state.to_account_info(),
                },
                signer_seeds,
            ),
            constants::AGENCY_TREASURY_UNITS,
        )?;

        // Mint LP reserve allocation
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.lp_reserve_vault.to_account_info(),
                    authority: ctx.accounts.launch_state.to_account_info(),
                },
                signer_seeds,
            ),
            constants::LP_RESERVE_UNITS,
        )?;

        emit!(LaunchCreated {
            launch_id,
            creator: launch.creator,
            mint: launch.mint,
            name,
            symbol,
            launch_mode: launch_mode as u8,
            curve_supply: constants::CURVE_SUPPLY_UNITS,
            treasury_supply: constants::AGENCY_TREASURY_UNITS,
            lp_reserve_supply: constants::LP_RESERVE_UNITS,
            timestamp: launch.created_at,
        });

        Ok(())
    }

    /// Record graduation event on the launch state.
    /// Called by the system after BondingCurve emits GraduationTriggered.
    pub fn record_graduation(
        ctx: Context<RecordGraduation>,
        policy_state: Pubkey,
        adapter_state: Pubkey,
    ) -> Result<()> {
        let launch = &mut ctx.accounts.launch_state;
        require!(launch.status == LaunchStatus::CurveActive, ErrorCode::InvalidStatus);

        launch.status = LaunchStatus::Stewarding;
        launch.graduated_at = Clock::get()?.unix_timestamp;
        launch.policy_state = policy_state;
        launch.adapter_state = adapter_state;

        emit!(LaunchGraduated {
            launch_id: launch.launch_id,
            mint: launch.mint,
            policy_state,
            adapter_state,
            timestamp: launch.graduated_at,
        });

        Ok(())
    }

    /// Record flight mode activation on the launch state.
    pub fn record_flight_mode(ctx: Context<RecordFlightMode>) -> Result<()> {
        let launch = &mut ctx.accounts.launch_state;
        require!(launch.status == LaunchStatus::Stewarding, ErrorCode::InvalidStatus);

        launch.status = LaunchStatus::FlightMode;
        launch.flight_mode_at = Clock::get()?.unix_timestamp;

        emit!(LaunchFlightMode {
            launch_id: launch.launch_id,
            mint: launch.mint,
            timestamp: launch.flight_mode_at,
        });

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(launch_id: [u8; 32], name: String, symbol: String, uri: String)]
pub struct CreateLaunch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + LaunchState::INIT_SPACE,
        seeds = [b"launch_state", launch_id.as_ref()],
        bump,
    )]
    pub launch_state: Account<'info, LaunchState>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = launch_state,
        seeds = [b"token_mint", launch_id.as_ref()],
        bump,
    )]
    pub mint: Account<'info, Mint>,

    // Bonding curve state (from bonding-curve program, initialized separately)
    /// CHECK: BondingCurve state PDA
    pub curve_state: UncheckedAccount<'info>,

    // Agency vaults state (from agency-vaults program, initialized separately)
    /// CHECK: VaultState PDA
    pub vault_state: UncheckedAccount<'info>,

    // Token accounts for allocations
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = curve_state,
    )]
    pub curve_token_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = vault_state,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = vault_state,
    )]
    pub lp_reserve_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RecordGraduation<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"launch_state", launch_state.launch_id.as_ref()],
        bump = launch_state.bump,
        has_one = creator,
    )]
    pub launch_state: Account<'info, LaunchState>,

    /// CHECK: Must match launch_state.creator
    pub creator: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RecordFlightMode<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"launch_state", launch_state.launch_id.as_ref()],
        bump = launch_state.bump,
    )]
    pub launch_state: Account<'info, LaunchState>,
}

// ── State ─────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct LaunchState {
    pub launch_id: [u8; 32],
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub launch_mode: LaunchMode,

    // Program state references
    pub curve_state: Pubkey,
    pub vault_state: Pubkey,
    pub policy_state: Pubkey,
    pub adapter_state: Pubkey,

    // Vault token accounts
    pub curve_token_vault: Pubkey,
    pub treasury_vault: Pubkey,
    pub lp_reserve_vault: Pubkey,

    // Status
    pub status: LaunchStatus,
    pub created_at: i64,
    pub graduated_at: i64,
    pub flight_mode_at: i64,

    // Metadata
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    #[max_len(200)]
    pub uri: String,

    pub bump: u8,
    pub mint_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, InitSpace)]
pub enum LaunchMode {
    /// Native launch through OpenClaw bonding curve
    Native = 0,
    /// Route through external pump-style rail
    PumpRoute = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, InitSpace)]
pub enum LaunchStatus {
    /// Bonding curve is active, pre-graduation
    CurveActive = 0,
    /// Post-graduation, agency stewardship active
    Stewarding = 1,
    /// Flight mode — agency sunset
    FlightMode = 2,
}

// ── Events ────────────────────────────────────────────────────────────────

#[event]
pub struct LaunchCreated {
    pub launch_id: [u8; 32],
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub launch_mode: u8,
    pub curve_supply: u64,
    pub treasury_supply: u64,
    pub lp_reserve_supply: u64,
    pub timestamp: i64,
}

#[event]
pub struct LaunchGraduated {
    pub launch_id: [u8; 32],
    pub mint: Pubkey,
    pub policy_state: Pubkey,
    pub adapter_state: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct LaunchFlightMode {
    pub launch_id: [u8; 32],
    pub mint: Pubkey,
    pub timestamp: i64,
}

// ── Errors ────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Symbol too long (max 10 chars)")]
    SymbolTooLong,
    #[msg("URI too long (max 200 chars)")]
    UriTooLong,
    #[msg("Invalid launch status for this operation")]
    InvalidStatus,
}
