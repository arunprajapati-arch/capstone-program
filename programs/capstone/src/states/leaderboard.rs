use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Leaderboard {
    pub event_id: u64,
    pub last_updated: i64,
    #[max_len(100)]
    pub entries: Vec<Entry>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, InitSpace)]
pub struct Entry {
    pub contributor: Pubkey,
    pub points: u64,
}


