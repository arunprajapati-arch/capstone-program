use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer_checked, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use crate::states::{Event, Winners};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct ClaimRewards<'info> {

    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        init_if_needed,
        payer = contributor,
        associated_token::mint = nft_mint,
        associated_token::authority = contributor
    )]
    pub contributor_ata_for_nft: InterfaceAccount<'info, TokenAccount>,

    pub nft_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = event,
    )]
    pub nft_vault: InterfaceAccount<'info, TokenAccount>,

    
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
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> ClaimRewards<'info> {

    

    pub fn transfer_nft(&mut self) -> Result<()> {

        require!(self.event.end_date < Clock::get()?.unix_timestamp, ErrorCode::EventNotEnded);

        let event_id_bytes = self.event.event_id.to_le_bytes();
        let maintainer = self.event.maintainer.key();
        let event_name = self.event.event_name.as_bytes();

        let seeds: &[&[u8]] = &[
            b"event",
            maintainer.as_ref(),
            event_id_bytes.as_ref(),
            event_name,
            &[self.event.event_bump],
        ];
        let signers_seeds = &[seeds];

        if self.contributor.key() == self.winners.winner {
            let cpi_ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                TransferChecked {
                    from: self.nft_vault.to_account_info(),
                    mint: self.nft_mint.to_account_info(),
                    to: self.contributor_ata_for_nft.to_account_info(),
                    authority: self.event.to_account_info(),
                },
                signers_seeds,
            );
    
           
            transfer_checked(cpi_ctx, 1, self.nft_mint.decimals)?;
        }else {
            msg!("No NFTs for you")
        }
        Ok(())
    }

    pub fn transfer_reward(&mut self) -> Result<()> {

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