use anchor_lang::prelude::*;
use crate::states::{Event, Leaderboard, Winners};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct FinishEvent<'info> {

    #[account(mut)]
    pub maintainer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"event", maintainer.key().as_ref(), event.event_id.to_le_bytes().as_ref(), event.event_name.as_bytes().as_ref()],
        bump = event.event_bump,
    )]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"leaderboard", event.event_id.to_le_bytes().as_ref()],
        bump = event.leaderboard_bump,
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    #[account(
        init,
        payer = maintainer,
        space = 8 + std::mem::size_of::<Winners>(),
        seeds = [b"winners", event.event_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub winners: Account<'info, Winners>,

    pub system_program: Program<'info, System>,


}

impl<'info> FinishEvent<'info> {
    pub fn finish_event(&mut self,event_id: u64, bumps: &FinishEventBumps) -> Result<()> {
        require!(self.event.end_date < Clock::get()?.unix_timestamp, ErrorCode::EventNotEnded);
        require!(self.maintainer.key() == self.event.maintainer, ErrorCode::InvalidMaintainer);
        require!(self.event.event_id == event_id, ErrorCode::InvalidEventId);

        self.leaderboard.entries.sort_by_key(|entry| entry.points);
        if self.leaderboard.entries.len() < 3 {
            return Err(ErrorCode::NotEnoughEntries.into());
        }
        let top_3_entries = self.leaderboard.entries.iter().take(3).collect::<Vec<_>>();
        self.winners.set_inner(Winners {
            event_id: self.event.event_id,
            winner: top_3_entries[0].contributor,
            runner_up: top_3_entries[1].contributor,
            third_place: top_3_entries[2].contributor,
            winners_bump: bumps.winners,
        });

        Ok(())
    }
}