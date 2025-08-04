use anchor_lang::prelude::*;
use crate::states::{Event, Leaderboard};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct DistributeRewards<'info> {

    #[account(mut)]
    pub maintainer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"event", maintainer.key().as_ref(), event.event_id.to_le_bytes().as_ref(), event.event_name.as_bytes()],
        bump = event.event_bump,
    )]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"leaderboard", event.event_id.to_le_bytes().as_ref()],
        bump = event.leaderboard_bump,
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    pub system_program: Program<'info, System>,
}

impl<'info> DistributeRewards<'info> {
    pub fn distribute_rewards(&mut self) -> Result<()> {
        require!(self.maintainer.key() == self.event.maintainer, ErrorCode::UnauthorizedMaintainer);

        let event = &mut self.event;
        let leaderboard = &mut self.leaderboard;

        let event_deadline = event.end_date;
        let current_time = Clock::get()?.unix_timestamp;

        if current_time < event_deadline {
            return Err(ErrorCode::EventNotEnded.into());
        }

        let total_points = leaderboard.entries.iter().map(|entry| entry.points).sum::<u64>();
        
        
        Ok(())
    }
}