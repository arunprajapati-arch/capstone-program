#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

mod contexts;
mod states;

use contexts::*;
use states::Issue;

declare_id!("FmmqVhW1XEkeFF5TJFkGKGfMysN35Z2rEfDHwae9hx92");

#[program]
pub mod capstone {
    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: u64,
        name: String,
        start_date: i64,
        end_date: i64,
        maintainer: Pubkey,
        rewards_split_percentage: [u16; 3],
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.create_event(event_id, name, start_date, end_date, maintainer, rewards_split_percentage, &ctx.bumps)?;
        ctx.accounts.deposit_rewards(amount)?;
        Ok(())
    }

    pub fn add_issue(
        ctx: Context<AddIssue>,
        issues: Vec<Issue>,
    ) -> Result<()> {
        ctx.accounts.add_issue(issues)?;
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Only the event maintainer can perform this action")]
    UnauthorizedMaintainer,
}
