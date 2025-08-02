import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Capstone } from "../target/types/capstone";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("capstone", () => {
  // Set up the test environment
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.capstone as Program<Capstone>;
  const provider = anchor.getProvider();
  const connection = provider.connection;



  // Simple test data
  const eventId = 1; // Use simple number instead of timestamp
  const eventName = "My First Event";

  it("Can create an event", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    
    // Give the maintainer some SOL for testing
    const airdropSignature = await provider.connection.requestAirdrop(
      maintainerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: airdropSignature,
      ...latestBlockhash,
    });

    // Simple event data
    const startDate = 1700000000; // Simple timestamp
    const endDate = 1700000000 + 86400; // 1 day later
    const rewardsplit = [50, 30, 20]; // 50%, 30%, 20%
    const rewardAmount = 1000000000; // 1 SOL in lamports

    // Find the addresses for our accounts (PDAs)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issues_book"),
        new BN(eventId).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId),
        eventName,
        new BN(startDate),
        new BN(endDate),
        maintainerKeypair.publicKey,
        rewardsplit,
        new BN(rewardAmount)
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        rewardsVault: vaultAddress,
        issuesBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check that the event was created correctly
    const event = await program.account.event.fetch(eventAddress);
    expect(event.eventId.toNumber()).to.equal(eventId);
    expect(event.eventName).to.equal(eventName);

    // Check that the issues book was created
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.eventId.toNumber()).to.equal(eventId);
    expect(issuesBook.issues).to.be.empty; // Should have no issues initially

    // Check that the leaderboard was created
    const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.eventId.toNumber()).to.equal(eventId);
    expect(leaderboard.entries).to.be.empty; // Should have no entries initially

    console.log("✅ Event created successfully!");
  });

  it("Can add issues to an event", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    
    // Give the maintainer some SOL for testing
    const airdropSignature = await provider.connection.requestAirdrop(
      maintainerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: airdropSignature,
      ...latestBlockhash,
    });

    // First, we need to create an event (same as above)
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 1).toArrayLike(Buffer, "le", 8), // Use different ID
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 1).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issues_book"),
        new BN(eventId + 1).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 1).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event first
    await program.methods
      .createEvent(
        new BN(eventId + 1),
        eventName,
        new BN(startDate),
        new BN(endDate),
        maintainerKeypair.publicKey,
        rewardsplit,
        new BN(rewardAmount)
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        rewardsVault: vaultAddress,
        issuesBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Now add some issues
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
    ];

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issuesBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check that the issues were added
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues).to.have.length(2); // Should have 2 issues now
    expect(issuesBook.issues[0].issueId.toNumber()).to.equal(1);
    expect(issuesBook.issues[1].issueId.toNumber()).to.equal(2);

    console.log("✅ Issues added successfully!");
  });

  it("Can add more issues later", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    
    // Give the maintainer some SOL for testing
    const airdropSignature = await provider.connection.requestAirdrop(
      maintainerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: airdropSignature,
      ...latestBlockhash,
    });

    // Create a new event for this test
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 2 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 2).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 2).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issues_book"),
        new BN(eventId + 2).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 2).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 2),
        eventName,
        new BN(startDate),
        new BN(endDate),
        maintainerKeypair.publicKey,
        rewardsplit,
        new BN(rewardAmount)
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        rewardsVault: vaultAddress,
        issuesBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add first batch of issues
    const firstBatch = [
      {
        issueId: new BN(1),
        resolvedStatus: false,
        contributor: null,
        points: new BN(100),
        resolvedAt: null,
      },
    ];

    await program.methods
      .addIssue(firstBatch)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issuesBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add second batch of issues later
    const secondBatch = [
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

    await program.methods
      .addIssue(secondBatch)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issuesBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check that all issues were added
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues).to.have.length(3); // Should have 3 issues total
    expect(issuesBook.issues[0].issueId.toNumber()).to.equal(1);
    expect(issuesBook.issues[1].issueId.toNumber()).to.equal(2);
    expect(issuesBook.issues[2].issueId.toNumber()).to.equal(3);

    // All should be unresolved since there's no resolve instruction
    expect(issuesBook.issues[0].resolvedStatus).to.be.false;
    expect(issuesBook.issues[1].resolvedStatus).to.be.false;
    expect(issuesBook.issues[2].resolvedStatus).to.be.false;

    console.log("✅ Multiple batches of issues added successfully!");
  });

  it("Cannot add issues if not the maintainer", async () => {
    // Create maintainer and unauthorized user
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const unauthorizedUser = anchor.web3.Keypair.generate();
    
    // Give both some SOL for testing
    const maintainerAirdrop = await provider.connection.requestAirdrop(
      maintainerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: maintainerAirdrop,
      ...latestBlockhash,
    });

    const userAirdrop = await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: userAirdrop,
      ...latestBlockhash2,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 3 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 3).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 3).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issues_book"),
        new BN(eventId + 3).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 3).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // First, maintainer creates the event (this should work)
    await program.methods
      .createEvent(
        new BN(eventId + 3),
        eventName,
        new BN(startDate),
        new BN(endDate),
        maintainerKeypair.publicKey,
        rewardsplit,
        new BN(rewardAmount)
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        rewardsVault: vaultAddress,
        issuesBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Now unauthorized user tries to add issues (this should fail)
    const maliciousIssues = [
      {
        issueId: new BN(999),
        resolvedStatus: false,
        contributor: null,
        points: new BN(1000000), // Trying to add high-value issue
        resolvedAt: null,
      },
    ];

    try {
      await program.methods
        .addIssue(maliciousIssues)
        .accountsPartial({
          maintainer: unauthorizedUser.publicKey, // Wrong maintainer!
          event: eventAddress,
          issuesBook: issuesBookAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();

      // If we get here, the test should fail
      expect.fail("Expected transaction to fail - unauthorized user should not be able to add issues");
    } catch (error) {
      // This should happen - unauthorized access should be blocked
      // The error could be either our custom error OR a seeds constraint error
      const errorMessage = error.message;
      const isBlocked = errorMessage.includes("UnauthorizedMaintainer") || 
                       errorMessage.includes("seeds constraint") ||
                       errorMessage.includes("AnchorError");
      expect(isBlocked).to.be.true;
      console.log("✅ Unauthorized access correctly blocked!");
    }

    // Verify that no malicious issues were added
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues).to.have.length(0); // Should still be empty
  });
});