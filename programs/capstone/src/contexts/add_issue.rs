use anchor_lang::prelude::*;
use crate::states::{Event, IssueBook, Issue};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct AddIssue<'info> {

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
        seeds = [b"issue_book", event.event_id.to_le_bytes().as_ref()],
        bump = event.issue_book_bump,
    )]
    pub issue_book: Account<'info, IssueBook>,

    pub system_program: Program<'info, System>,
}

impl<'info> AddIssue<'info> {
    pub fn add_issue(
        &mut self,
        issues: Vec<Issue>,
    ) -> Result<()> {
        // Check that the signer is the event maintainer
        require!(
            self.maintainer.key() == self.event.maintainer,
            ErrorCode::UnauthorizedMaintainer
        );

       let issue_book = &mut self.issue_book;
       for mut issue in issues {
        issue.resolved_status = false;
        issue.resolved_at = None;
        issue.contributor = None;
        issue_book.issues.push(issue);
       }
        Ok(())
    }
}