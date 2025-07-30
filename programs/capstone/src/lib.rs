use anchor_lang::prelude::*;

declare_id!("FmmqVhW1XEkeFF5TJFkGKGfMysN35Z2rEfDHwae9hx92");

#[program]
pub mod capstone {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
