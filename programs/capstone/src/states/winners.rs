use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Winners {
    pub event_id: u64,
    pub winner: Pubkey,
    pub runner_up: Pubkey,
    pub third_place: Pubkey,
    pub winners_bump: u8,
}