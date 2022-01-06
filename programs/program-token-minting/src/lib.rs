use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod program_token_minting {
    use super::*;
    pub fn create_mint(_ctx: Context<CreateMint>) -> ProgramResult {
        Ok(())
    }

    pub fn create_token_account(_ctx: Context<CreateTokenAccount>) -> ProgramResult {
        Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> ProgramResult {
        token::mint_to((&*ctx.accounts).into(), amount)
    } 
}

#[derive(Accounts)]
pub struct CreateMint<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = payer,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateTokenAccount<'info> {
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = authority,
    )]
    pub token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut, has_one = mint)]
    pub token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    pub mint_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

impl<'info> From<&MintTokens<'info>> for CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
    fn from(accs: &MintTokens<'info>) -> Self {
        let cpi_program = accs.token_program.to_account_info();
        let cpi_accounts = MintTo {
            mint: accs.mint.to_account_info(),
            to: accs.token.to_account_info(),
            authority: accs.mint_authority.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
