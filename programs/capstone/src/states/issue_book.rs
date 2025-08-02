use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct IssueBook {
    pub event_id: u64,
    #[max_len(50)]
    pub issues: Vec<Issue>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Issue {
    pub issue_id: u64,
    pub resolved_status: bool,
    pub contributor: Option<Pubkey>,
    pub points: u64,
    pub resolved_at: Option<i64>,
}