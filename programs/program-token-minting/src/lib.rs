use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod program_token_minting {
    use super::*;
    pub fn create_mint(ctx: Context<CreateMint>) -> ProgramResult {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateMint {}
