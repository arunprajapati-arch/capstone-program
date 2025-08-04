use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {

    #[msg("Invalid maintainer")]
    InvalidMaintainer,

    #[msg("Only the event maintainer can perform this action")]
    UnauthorizedMaintainer,

    #[msg("Invalid issue id")]
    InvalidIssueId,

    #[msg("Invalid event id")]
    InvalidEventId,

    #[msg("Event not ended")]
    EventNotEnded,

    #[msg("Event already ended")]
    EventAlreadyEnded,

    #[msg("Event already started")]
    EventAlreadyStarted,
}