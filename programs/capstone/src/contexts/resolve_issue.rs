use anchor_lang::prelude::*;
use crate::states::{Entry, Event, IssueBook, Leaderboard};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct ResolveIssue<'info> {

    #[account(mut)]
    pub maintainer: Signer<'info>,

    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"issue_book", event.event_id.to_le_bytes().as_ref()],
        bump = event.issue_book_bump,
    )]
    pub issue_book: Account<'info, IssueBook>,

    #[account(
        mut,
        seeds = [b"leaderboard", event.event_id.to_le_bytes().as_ref()],
        bump = event.leaderboard_bump,
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    pub system_program: Program<'info, System>,
}

impl<'info> ResolveIssue<'info> {
    pub fn resolve_issue(&mut self, issue_id: u64, contributor: Pubkey) -> Result<()> {

        require!(self.maintainer.key() == self.event.maintainer, ErrorCode::InvalidMaintainer);

        let current_issue = self.issue_book.issues.iter_mut().find(|issue| issue.issue_id == issue_id && issue.resolved_status == false);
        if current_issue.is_none() {
            return Err(ErrorCode::InvalidIssueId.into());
        }

        let to_resolve_issue = current_issue.unwrap();

        to_resolve_issue.resolved_status = true;
        to_resolve_issue.resolved_at = Some(Clock::get()?.unix_timestamp);
        to_resolve_issue.contributor = Some(contributor);

        let  leaderboard = &mut self.leaderboard;
        let  entry = leaderboard.entries.iter_mut().find(|entry| entry.contributor == contributor);
        if entry.is_none() {
            leaderboard.entries.push(Entry {
                contributor,
                points: to_resolve_issue.points,
            });
        } else {
            entry.unwrap().points += to_resolve_issue.points;
        }

        Ok(())
    }
}

