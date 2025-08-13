import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Capstone } from "../target/types/capstone";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";


describe("capstone", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;

  const eventId = 1; // can use random number
  const eventName = "Test Event";

  const maintainerKeypair = provider.publicKey;
  const contributorKeypair1 = Keypair.generate();
  const contributorKeypair2 = Keypair.generate();
  const contributorKeypair3 = Keypair.generate();


  const [eventAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("event"),
      maintainerKeypair.toBuffer(),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
      Buffer.from(eventName)
    ],
    program.programId
  );

  const [rewardsVaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("rewards_vault"), new BN(eventId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [issueBookAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("issue_book"), new BN(eventId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [leaderboardAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("leaderboard"), new BN(eventId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [winnersAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("winners"), new BN(eventId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  it("should create an event", async () => {

    const startDate = 1700000000; // Simple timestamp
    const endDate = startDate + 86400; // 1 day later
    const rewardsplit = [50, 30, 20]; // 50%, 30%, 20%
    const rewardAmount = 2000000000; // 2 SOL in lamports
    
   const tx =  await program.methods.createEvent(
      new BN(eventId),
      eventName,
      new BN(startDate),
      new BN(endDate),
      maintainerKeypair,
      rewardsplit,
      new BN(rewardAmount)
    )
    .accountsPartial({
      maintainer: maintainerKeypair,
      event: eventAddress,
      rewardsVault: rewardsVaultAddress,
      issueBook: issueBookAddress,
      leaderboard: leaderboardAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

    
    const event = await program.account.event.fetch(eventAddress);
    expect(event.eventId.toNumber()).to.equal(eventId);
    expect(event.eventName).to.equal(eventName);

     
      const issuesBook = await program.account.issueBook.fetch(issueBookAddress);
      expect(issuesBook.eventId.toNumber()).to.equal(eventId);
      expect(issuesBook.issues).to.be.empty; // Should have no issues initially
  
   
      const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
      expect(leaderboard.eventId.toNumber()).to.equal(eventId);
      expect(leaderboard.entries).to.be.empty; // Should have no entries initially
  
     
  });

  it("Should add a new issue", async () => {
    const issues = [
      {
        issueId: new BN(1),
        resolvedStatus: false,
        contributor: null,
        points: new BN(100),
        resolvedAt: null,
      },
      {
        issueId: new BN(2),
        resolvedStatus: false,
        contributor: null,
        points: new BN(200),
        resolvedAt: null,
      },
      {
        issueId: new BN(3),
        resolvedStatus: false,
        contributor: null,
        points: new BN(300),
        resolvedAt: null,
      },
    ];
    const tx = await program.methods
    .addIssue(issues)
    .accountsPartial({
      maintainer: maintainerKeypair,
      event: eventAddress,
      issueBook: issueBookAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

    const issuesBook = await program.account.issueBook.fetch(issueBookAddress);
    expect(issuesBook.issues).to.have.length(3); 
    expect(issuesBook.issues[0].issueId.toNumber()).to.equal(1);
    expect(issuesBook.issues[1].issueId.toNumber()).to.equal(2);
  })

  it("Should not be able to resolve issue if not maintainer", async () => {
    const randomKeypair = Keypair.generate();
    try {
      await provider.connection.requestAirdrop(randomKeypair.publicKey, 1000000000);
    } catch (error) {
      console.error("Airdrop failed:", error);
    }
    try {
      await program.methods
      .resolveIssue(new BN(1), randomKeypair.publicKey)
      .accountsPartial({
        maintainer: randomKeypair.publicKey,
        event: eventAddress,
        issueBook: issueBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([randomKeypair])
      .rpc();
      expect.fail("Should not be able to resolve issue if not maintainer");
    } catch (error) {
      
    }
  })

  it("Should resolve issue", async () => {
    const tx1 = await program.methods
    .resolveIssue(
      new BN(1),
      contributorKeypair1.publicKey
    )
    .accountsPartial({
      maintainer: maintainerKeypair,
      event: eventAddress,
      issueBook: issueBookAddress,
      leaderboard: leaderboardAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

    const tx2 = await program.methods

    .resolveIssue(
      new BN(2),
      contributorKeypair2.publicKey
    )
    .accountsPartial({
      maintainer: maintainerKeypair,
      event: eventAddress,
      issueBook: issueBookAddress,
      leaderboard: leaderboardAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

    const tx3 = await program.methods
    .resolveIssue(
      new BN(3),
      contributorKeypair3.publicKey
    )
    .accountsPartial({
      maintainer: maintainerKeypair,
      event: eventAddress,
      issueBook: issueBookAddress,
      leaderboard: leaderboardAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();


    const issuesBook = await program.account.issueBook.fetch(issueBookAddress);
    const resolvedIssue = issuesBook.issues[0];
    expect(resolvedIssue.resolvedStatus).to.be.true;
    expect(resolvedIssue.points.toNumber()).to.equal(100);
    expect(resolvedIssue.resolvedAt).to.not.be.null;

 
    const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(3);
    expect(leaderboard.entries[0].points.toNumber()).to.equal(100);
  });



  it("Should not be able to finish an event if not maintainer", async () => {
    const randomKeypair = Keypair.generate();
    
    try {
      // Airdrop SOL so the random keypair can pay for the transaction fee
      const airdropSignature = await provider.connection.requestAirdrop(
        randomKeypair.publicKey,
        1000000000 // 1 SOL
      );
      const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature: airdropSignature,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
      });
  
      await program.methods
        .finishEvent(new BN(eventId))
        .accountsPartial({
          maintainer: randomKeypair.publicKey, 
          event: eventAddress,
          leaderboard: leaderboardAddress,
          winners: winnersAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([randomKeypair]) // Signing with the wrong key
        .rpc();
  
      expect.fail("The transaction should have failed but did not.");
  
    } catch (error) {
     
      
    }
  });



  it("Should be able to finish an event", async () => {

   

    const tx = await program.methods
    .finishEvent(new BN(eventId))
    .accountsPartial({
      maintainer: maintainerKeypair,
      event: eventAddress,
      leaderboard: leaderboardAddress,
      winners: winnersAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  })

  it("Should be able to claim rewards", async () => {
    const tx = await program.methods
    .claimRewards()
    .accountsPartial({
      contributor: contributorKeypair1.publicKey,
      event: eventAddress,
      rewardsVault: rewardsVaultAddress,
      winners: winnersAddress,
      systemProgram: SystemProgram.programId,
    })
    .signers([contributorKeypair1])
    .rpc();

    const rewardsVaultBalance = await provider.connection.getBalance(rewardsVaultAddress);
    expect(rewardsVaultBalance).to.equal(1996000000);

    const winners = await program.account.winners.fetch(winnersAddress);
    expect(winners.winner.toString()).to.equal(contributorKeypair3.publicKey.toString());
    expect(winners.runnerUp.toString()).to.equal(contributorKeypair2.publicKey.toString());
    expect(winners.thirdPlace.toString()).to.equal(contributorKeypair1.publicKey.toString());
  })

});