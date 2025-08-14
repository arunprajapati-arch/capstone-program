use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer_checked, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use crate::states::{Event, IssueBook, Leaderboard};

#[derive(Accounts)]
#[instruction(event_id: u64, name: String)]
pub struct CreateEvent<'info> {

    #[account(mut)]
    pub maintainer: Signer<'info>,

    #[account(
        init,
        payer = maintainer, 
        space = Event::DISCRIMINATOR.len() + Event::INIT_SPACE,
        seeds = [b"event", maintainer.key().as_ref(), event_id.to_le_bytes().as_ref(), name.as_bytes()],
        bump,
    )]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"rewards_vault", event_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub rewards_vault: SystemAccount<'info>,

    pub nft_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = maintainer,
        associated_token::token_program = token_program
    )]
    pub maintainer_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = maintainer,
        associated_token::mint = nft_mint,
        associated_token::authority = event,
        associated_token::token_program = token_program,
    )]
    pub nft_vault: InterfaceAccount<'info, TokenAccount>,



    #[account(
        init,
        payer = maintainer,
        space = IssueBook::DISCRIMINATOR.len() + IssueBook::INIT_SPACE,
        seeds = [b"issue_book", event_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub issue_book: Account<'info, IssueBook>,

    #[account(
        init,
        payer = maintainer,
        space = Leaderboard::DISCRIMINATOR.len() + Leaderboard::INIT_SPACE,
        seeds = [b"leaderboard", event_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub leaderboard: Account<'info, Leaderboard>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> CreateEvent<'info> {
    pub fn create_event(
        &mut self,
        event_id: u64,
        name: String,
        start_date: i64,
        end_date: i64,
        maintainer: Pubkey,
        rewards_split_percentage: [u16; 3],
       bumps: &CreateEventBumps,
    ) -> Result<()> {
        self.event.set_inner(Event { 
            event_id,
            event_name: name,
            maintainer,
            start_date, 
            end_date,
            winner_nft_mint: self.nft_mint.key(),
            rewards_split_percentage,
            event_bump: bumps.event, 
            rewards_vault_bump: bumps.rewards_vault,
            issue_book_bump: bumps.issue_book, 
            leaderboard_bump: bumps.leaderboard,
        });

        // Initialize IssueBook
        self.issue_book.set_inner(IssueBook {
            event_id,
            issues: Vec::new(),
        });

        // Initialize Leaderboard
        self.leaderboard.set_inner(Leaderboard {
            event_id,
            last_updated: start_date,
            entries: Vec::new(),
        });

        Ok(())
    }

     pub fn deposit_nft(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.maintainer_ata.to_account_info(),
            mint: self.nft_mint.to_account_info(),
            to: self.nft_vault.to_account_info(),
            authority: self.maintainer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer_checked(cpi_ctx, 1, 0)
    }

    pub fn deposit_rewards(&mut self, amount: u64) -> Result<()> {
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.maintainer.to_account_info(),
            to: self.rewards_vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, amount)?;
        Ok(())
    }


}