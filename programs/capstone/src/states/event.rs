use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace,)]
pub struct Event {
    pub event_id: u64,
    #[max_len(32)]
    pub event_name: String,
    pub maintainer: Pubkey,
    pub start_date: i64,
    pub end_date: i64,
    pub rewards_split_percentage: [u16; 3],
    pub event_bump: u8,
    pub rewards_vault_bump: u8,
    pub issue_book_bump: u8,
    pub leaderboard_bump: u8,
}