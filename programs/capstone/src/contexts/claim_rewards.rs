use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use crate::states::{Event, Winners};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct ClaimRewards<'info> {

    #[account(mut)]
    pub contributor: Signer<'info>,

    
    #[account(
        mut,
        seeds = [b"event", event.maintainer.as_ref(), event.event_id.to_le_bytes().as_ref(), event.event_name.as_bytes().as_ref()],
        bump = event.event_bump,
    )]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        seeds = [b"rewards_vault", event.event_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub rewards_vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"winners", event.event_id.to_le_bytes().as_ref()],
        bump = winners.winners_bump,
    )]
    pub winners: Account<'info, Winners>,

    pub system_program: Program<'info, System>,
}

impl<'info> ClaimRewards<'info> {
    pub fn claim_rewards(&mut self) -> Result<()> {
        require!(self.event.end_date < Clock::get()?.unix_timestamp, ErrorCode::EventNotEnded);

        let total_rewards = self.rewards_vault.lamports();
        let reward_to_send:u64;

       if self.contributor.key() == self.winners.winner {
        reward_to_send = (total_rewards * self.event.rewards_split_percentage[0] as u64) / 10000;
       } else if self.contributor.key() == self.winners.runner_up {
        reward_to_send = (total_rewards * self.event.rewards_split_percentage[1] as u64) / 10000;
       } else if self.contributor.key() == self.winners.third_place {
        reward_to_send = (total_rewards * self.event.rewards_split_percentage[2] as u64) / 10000;
       } else {
        return Err(ErrorCode::InvalidContributor.into());
       }
       let cpi_program = self.system_program.to_account_info();
       let cpi_accounts = Transfer {
        from: self.rewards_vault.to_account_info(),
        to: self.contributor.to_account_info(),
       };

       let event_id_bytes = self.event.event_id.to_le_bytes();
       let seeds = [
        b"rewards_vault",
        event_id_bytes.as_ref(),
        &[self.event.rewards_vault_bump],
       ];
       let signer_seeds = &[&seeds[..]];
       let cpi_context = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
       transfer(cpi_context, reward_to_send)?;

        Ok(())
    }
}