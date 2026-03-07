use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("BCrv1111111111111111111111111111111111111111");

/// Protocol constants
pub mod constants {
    /// Total token supply: 1 billion
    pub const TOTAL_SUPPLY: u64 = 1_000_000_000;
    /// Tokens allocated to bonding curve: 700M (70%)
    pub const CURVE_SUPPLY: u64 = 700_000_000;
    /// SOL target for graduation: 85 SOL (in lamports)
    pub const GRADUATION_SOL_TARGET: u64 = 85_000_000_000;
    /// Protocol fee: 200 basis points (2%)
    pub const CURVE_PROTOCOL_FEE_BPS: u16 = 200;
    /// Fee split to LP accumulator: 70%
    pub const FEE_SPLIT_LP_BPS: u16 = 7000;
    /// Fee split to house: 20%
    pub const FEE_SPLIT_HOUSE_BPS: u16 = 2000;
    /// Fee split to referral pool: 10%
    pub const FEE_SPLIT_REFERRAL_BPS: u16 = 1000;
    /// Token decimals
    pub const TOKEN_DECIMALS: u8 = 6;
    /// Curve supply in smallest units
    pub const CURVE_SUPPLY_UNITS: u64 = CURVE_SUPPLY * 1_000_000; // with 6 decimals
    /// Virtual SOL offset for curve pricing (prevents division by zero at start)
    pub const VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL virtual
    /// Virtual token reserves for initial pricing
    pub const VIRTUAL_TOKEN_RESERVES: u64 = CURVE_SUPPLY_UNITS;
}

#[program]
pub mod bonding_curve {
    use super::*;

    /// Initialize a new bonding curve for a launched token.
    /// Called by LaunchFactory after token creation.
    pub fn initialize(
        ctx: Context<Initialize>,
        launch_id: [u8; 32],
    ) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        curve.launch_id = launch_id;
        curve.mint = ctx.accounts.mint.key();
        curve.authority = ctx.accounts.authority.key();
        curve.curve_vault = ctx.accounts.curve_token_vault.key();
        curve.sol_vault = ctx.accounts.sol_vault.key();
        curve.fee_accumulator = ctx.accounts.fee_accumulator.key();
        curve.house_vault = ctx.accounts.house_vault.key();
        curve.total_supply_on_curve = constants::CURVE_SUPPLY_UNITS;
        curve.tokens_sold = 0;
        curve.raised_sol = 0;
        curve.is_graduated = false;
        curve.graduation_timestamp = 0;
        curve.total_trades = 0;
        curve.total_fees_collected = 0;
        curve.bump = ctx.bumps.curve_state;
        curve.sol_vault_bump = ctx.bumps.sol_vault;
        curve.created_at = Clock::get()?.unix_timestamp;

        emit!(CurveInitialized {
            launch_id,
            mint: curve.mint,
            curve_supply: constants::CURVE_SUPPLY_UNITS,
            graduation_target: constants::GRADUATION_SOL_TARGET,
        });

        Ok(())
    }

    /// Buy tokens from the bonding curve.
    /// Uses constant-product-like formula with virtual reserves.
    pub fn buy(ctx: Context<Trade>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.is_graduated, ErrorCode::CurveGraduated);
        require!(sol_amount > 0, ErrorCode::InvalidAmount);

        // Calculate protocol fee
        let fee = sol_amount
            .checked_mul(constants::CURVE_PROTOCOL_FEE_BPS as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();
        let sol_after_fee = sol_amount.checked_sub(fee).unwrap();

        // Calculate tokens out using constant-product: x * y = k
        // virtual_sol = VIRTUAL_SOL_RESERVES + raised_sol
        // virtual_tokens = VIRTUAL_TOKEN_RESERVES - tokens_sold
        let virtual_sol = constants::VIRTUAL_SOL_RESERVES
            .checked_add(curve.raised_sol)
            .unwrap();
        let virtual_tokens = constants::VIRTUAL_TOKEN_RESERVES
            .checked_sub(curve.tokens_sold)
            .unwrap();

        // tokens_out = virtual_tokens - (k / (virtual_sol + sol_after_fee))
        // k = virtual_sol * virtual_tokens
        let k = (virtual_sol as u128)
            .checked_mul(virtual_tokens as u128)
            .unwrap();
        let new_virtual_sol = (virtual_sol as u128)
            .checked_add(sol_after_fee as u128)
            .unwrap();
        let new_virtual_tokens = k.checked_div(new_virtual_sol).unwrap();
        let tokens_out = (virtual_tokens as u128)
            .checked_sub(new_virtual_tokens)
            .unwrap() as u64;

        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);
        require!(
            curve.tokens_sold.checked_add(tokens_out).unwrap() <= constants::CURVE_SUPPLY_UNITS,
            ErrorCode::InsufficientCurveSupply
        );

        // Transfer SOL from buyer to sol_vault
        let transfer_sol_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.sol_vault.key(),
            sol_after_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_sol_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Transfer fee: 70% to LP, 20% to house, 10% to referral pool
        let fee_to_lp = fee
            .checked_mul(constants::FEE_SPLIT_LP_BPS as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();
        let fee_to_house = fee
            .checked_mul(constants::FEE_SPLIT_HOUSE_BPS as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();
        let fee_to_referral = fee
            .checked_sub(fee_to_lp)
            .unwrap()
            .checked_sub(fee_to_house)
            .unwrap();

        if fee_to_lp > 0 {
            let transfer_fee_lp_ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.fee_accumulator.key(),
                fee_to_lp,
            );
            anchor_lang::solana_program::program::invoke(
                &transfer_fee_lp_ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.fee_accumulator.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        if fee_to_house > 0 {
            let transfer_fee_house_ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.house_vault.key(),
                fee_to_house,
            );
            anchor_lang::solana_program::program::invoke(
                &transfer_fee_house_ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.house_vault.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        if fee_to_referral > 0 {
            let transfer_fee_ref_ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.referral_vault.key(),
                fee_to_referral,
            );
            anchor_lang::solana_program::program::invoke(
                &transfer_fee_ref_ix,
                &[
                    ctx.accounts.buyer.to_account_info(),
                    ctx.accounts.referral_vault.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        // Transfer tokens from curve vault to buyer
        let seeds = &[
            b"curve_state",
            curve.launch_id.as_ref(),
            &[curve.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.curve_token_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.curve_state.to_account_info(),
                },
                signer_seeds,
            ),
            tokens_out,
        )?;

        // Update state
        curve.tokens_sold = curve.tokens_sold.checked_add(tokens_out).unwrap();
        curve.raised_sol = curve.raised_sol.checked_add(sol_after_fee).unwrap();
        curve.total_trades = curve.total_trades.checked_add(1).unwrap();
        curve.total_fees_collected = curve.total_fees_collected.checked_add(fee).unwrap();

        emit!(TradeExecuted {
            launch_id: curve.launch_id,
            trader: ctx.accounts.buyer.key(),
            is_buy: true,
            sol_amount: sol_after_fee,
            token_amount: tokens_out,
            fee,
            tokens_sold_after: curve.tokens_sold,
            raised_sol_after: curve.raised_sol,
        });

        // Check graduation
        if curve.raised_sol >= constants::GRADUATION_SOL_TARGET {
            curve.is_graduated = true;
            curve.graduation_timestamp = Clock::get()?.unix_timestamp;

            emit!(GraduationTriggered {
                launch_id: curve.launch_id,
                mint: curve.mint,
                raised_sol: curve.raised_sol,
                tokens_sold: curve.tokens_sold,
                timestamp: curve.graduation_timestamp,
            });
        }

        Ok(())
    }

    /// Sell tokens back to the bonding curve.
    pub fn sell(ctx: Context<Trade>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.curve_state;
        require!(!curve.is_graduated, ErrorCode::CurveGraduated);
        require!(token_amount > 0, ErrorCode::InvalidAmount);

        // Calculate SOL out using constant-product inverse
        let virtual_sol = constants::VIRTUAL_SOL_RESERVES
            .checked_add(curve.raised_sol)
            .unwrap();
        let virtual_tokens = constants::VIRTUAL_TOKEN_RESERVES
            .checked_sub(curve.tokens_sold)
            .unwrap();

        let k = (virtual_sol as u128)
            .checked_mul(virtual_tokens as u128)
            .unwrap();
        let new_virtual_tokens = (virtual_tokens as u128)
            .checked_add(token_amount as u128)
            .unwrap();
        let new_virtual_sol = k.checked_div(new_virtual_tokens).unwrap();
        let gross_sol_out = (virtual_sol as u128)
            .checked_sub(new_virtual_sol)
            .unwrap() as u64;

        // Calculate protocol fee on SOL out
        let fee = gross_sol_out
            .checked_mul(constants::CURVE_PROTOCOL_FEE_BPS as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();
        let sol_out = gross_sol_out.checked_sub(fee).unwrap();

        require!(sol_out >= min_sol_out, ErrorCode::SlippageExceeded);

        // Transfer tokens from seller to curve vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.curve_token_vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // Transfer SOL from sol_vault to seller (PDA signer)
        let seeds = &[
            b"curve_state",
            curve.launch_id.as_ref(),
            &[curve.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let sol_vault_seeds = &[
            b"sol_vault",
            curve.launch_id.as_ref(),
            &[curve.sol_vault_bump],
        ];
        let sol_vault_signer = &[&sol_vault_seeds[..]];

        // Transfer SOL to seller
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? += sol_out;

        // Transfer fee splits: 70% LP, 20% house, 10% referral
        let fee_to_lp = fee
            .checked_mul(constants::FEE_SPLIT_LP_BPS as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();
        let fee_to_house = fee
            .checked_mul(constants::FEE_SPLIT_HOUSE_BPS as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();
        let fee_to_referral = fee
            .checked_sub(fee_to_lp)
            .unwrap()
            .checked_sub(fee_to_house)
            .unwrap();

        if fee_to_lp > 0 {
            **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= fee_to_lp;
            **ctx.accounts.fee_accumulator.to_account_info().try_borrow_mut_lamports()? += fee_to_lp;
        }

        if fee_to_house > 0 {
            **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= fee_to_house;
            **ctx.accounts.house_vault.to_account_info().try_borrow_mut_lamports()? += fee_to_house;
        }

        if fee_to_referral > 0 {
            **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= fee_to_referral;
            **ctx.accounts.referral_vault.to_account_info().try_borrow_mut_lamports()? += fee_to_referral;
        }

        // Update state
        curve.tokens_sold = curve.tokens_sold.checked_sub(token_amount).unwrap();
        curve.raised_sol = curve.raised_sol.checked_sub(gross_sol_out).unwrap();
        curve.total_trades = curve.total_trades.checked_add(1).unwrap();
        curve.total_fees_collected = curve.total_fees_collected.checked_add(fee).unwrap();

        emit!(TradeExecuted {
            launch_id: curve.launch_id,
            trader: ctx.accounts.buyer.key(),
            is_buy: false,
            sol_amount: sol_out,
            token_amount,
            fee,
            tokens_sold_after: curve.tokens_sold,
            raised_sol_after: curve.raised_sol,
        });

        Ok(())
    }

    /// Read-only: get current price estimate for a given SOL input
    pub fn get_price_quote(ctx: Context<GetQuote>, sol_amount: u64, is_buy: bool) -> Result<()> {
        let curve = &ctx.accounts.curve_state;

        let virtual_sol = constants::VIRTUAL_SOL_RESERVES
            .checked_add(curve.raised_sol)
            .unwrap();
        let virtual_tokens = constants::VIRTUAL_TOKEN_RESERVES
            .checked_sub(curve.tokens_sold)
            .unwrap();

        if is_buy {
            let fee = sol_amount
                .checked_mul(constants::CURVE_PROTOCOL_FEE_BPS as u64)
                .unwrap()
                .checked_div(10_000)
                .unwrap();
            let sol_after_fee = sol_amount.checked_sub(fee).unwrap();
            let k = (virtual_sol as u128).checked_mul(virtual_tokens as u128).unwrap();
            let new_virtual_sol = (virtual_sol as u128).checked_add(sol_after_fee as u128).unwrap();
            let new_virtual_tokens = k.checked_div(new_virtual_sol).unwrap();
            let tokens_out = (virtual_tokens as u128).checked_sub(new_virtual_tokens).unwrap() as u64;

            emit!(PriceQuote {
                launch_id: curve.launch_id,
                is_buy: true,
                input_amount: sol_amount,
                output_amount: tokens_out,
                fee,
                current_price_num: virtual_sol,
                current_price_den: virtual_tokens,
            });
        } else {
            let k = (virtual_sol as u128).checked_mul(virtual_tokens as u128).unwrap();
            let new_virtual_tokens = (virtual_tokens as u128).checked_add(sol_amount as u128).unwrap();
            let new_virtual_sol = k.checked_div(new_virtual_tokens).unwrap();
            let gross_sol_out = (virtual_sol as u128).checked_sub(new_virtual_sol).unwrap() as u64;
            let fee = gross_sol_out
                .checked_mul(constants::CURVE_PROTOCOL_FEE_BPS as u64)
                .unwrap()
                .checked_div(10_000)
                .unwrap();
            let sol_out = gross_sol_out.checked_sub(fee).unwrap();

            emit!(PriceQuote {
                launch_id: curve.launch_id,
                is_buy: false,
                input_amount: sol_amount,
                output_amount: sol_out,
                fee,
                current_price_num: virtual_sol,
                current_price_den: virtual_tokens,
            });
        }

        Ok(())
    }
}

// ── Accounts ──────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(launch_id: [u8; 32])]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + CurveState::INIT_SPACE,
        seeds = [b"curve_state", launch_id.as_ref()],
        bump,
    )]
    pub curve_state: Account<'info, CurveState>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = curve_state,
    )]
    pub curve_token_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA used as SOL vault
    #[account(
        mut,
        seeds = [b"sol_vault", launch_id.as_ref()],
        bump,
    )]
    pub sol_vault: SystemAccount<'info>,

    /// CHECK: Fee accumulator vault (SOL)
    #[account(mut)]
    pub fee_accumulator: SystemAccount<'info>,

    /// CHECK: House vault (SOL)
    #[account(mut)]
    pub house_vault: SystemAccount<'info>,

    /// CHECK: Referral pool vault (SOL)
    #[account(mut)]
    pub referral_vault: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Trade<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"curve_state", curve_state.launch_id.as_ref()],
        bump = curve_state.bump,
    )]
    pub curve_state: Account<'info, CurveState>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = curve_state,
    )]
    pub curve_token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    /// CHECK: PDA SOL vault
    #[account(
        mut,
        seeds = [b"sol_vault", curve_state.launch_id.as_ref()],
        bump = curve_state.sol_vault_bump,
    )]
    pub sol_vault: SystemAccount<'info>,

    /// CHECK: Fee accumulator vault
    #[account(
        mut,
        address = curve_state.fee_accumulator,
    )]
    pub fee_accumulator: SystemAccount<'info>,

    /// CHECK: House vault
    #[account(
        mut,
        address = curve_state.house_vault,
    )]
    pub house_vault: SystemAccount<'info>,

    /// CHECK: Referral pool vault
    #[account(
        mut,
        address = curve_state.referral_vault,
    )]
    pub referral_vault: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetQuote<'info> {
    pub curve_state: Account<'info, CurveState>,
}

// ── State ─────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct CurveState {
    /// Unique launch identifier
    pub launch_id: [u8; 32],
    /// Token mint address
    pub mint: Pubkey,
    /// Launch authority
    pub authority: Pubkey,
    /// Token vault holding curve supply
    pub curve_vault: Pubkey,
    /// SOL vault PDA
    pub sol_vault: Pubkey,
    /// Fee accumulator vault address
    pub fee_accumulator: Pubkey,
    /// House vault address
    pub house_vault: Pubkey,
    /// Referral pool vault address
    pub referral_vault: Pubkey,
    /// Total supply allocated to curve (in token units)
    pub total_supply_on_curve: u64,
    /// Total tokens sold from curve
    pub tokens_sold: u64,
    /// Total SOL raised (excluding fees)
    pub raised_sol: u64,
    /// Whether graduation has triggered
    pub is_graduated: bool,
    /// Timestamp of graduation (0 if not graduated)
    pub graduation_timestamp: i64,
    /// Total number of trades
    pub total_trades: u64,
    /// Total fees collected (SOL)
    pub total_fees_collected: u64,
    /// PDA bump
    pub bump: u8,
    /// SOL vault PDA bump
    pub sol_vault_bump: u8,
    /// Creation timestamp
    pub created_at: i64,
}

// ── Events ────────────────────────────────────────────────────────────────

#[event]
pub struct CurveInitialized {
    pub launch_id: [u8; 32],
    pub mint: Pubkey,
    pub curve_supply: u64,
    pub graduation_target: u64,
}

#[event]
pub struct TradeExecuted {
    pub launch_id: [u8; 32],
    pub trader: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub fee: u64,
    pub tokens_sold_after: u64,
    pub raised_sol_after: u64,
}

#[event]
pub struct GraduationTriggered {
    pub launch_id: [u8; 32],
    pub mint: Pubkey,
    pub raised_sol: u64,
    pub tokens_sold: u64,
    pub timestamp: i64,
}

#[event]
pub struct PriceQuote {
    pub launch_id: [u8; 32],
    pub is_buy: bool,
    pub input_amount: u64,
    pub output_amount: u64,
    pub fee: u64,
    pub current_price_num: u64,
    pub current_price_den: u64,
}

// ── Errors ────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Curve has already graduated")]
    CurveGraduated,
    #[msg("Invalid amount: must be greater than zero")]
    InvalidAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient supply remaining on curve")]
    InsufficientCurveSupply,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
