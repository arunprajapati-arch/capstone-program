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
        Buffer.from("issue_book"),
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
        issueBook: issuesBookAddress,
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
        Buffer.from("issue_book"),
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
        issueBook: issuesBookAddress,
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
        issueBook: issuesBookAddress,
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
        Buffer.from("issue_book"),
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
        issueBook: issuesBookAddress,
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
        issueBook: issuesBookAddress,
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
        issueBook: issuesBookAddress,
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
        Buffer.from("issue_book"),
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
        issueBook: issuesBookAddress,
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
          issueBook: issuesBookAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();

      // If we get here, the test should fail
      expect.fail("Expected transaction to fail - unauthorized user should not be able to add issues");
    } catch (error) {
      // This should happen - unauthorized access should be blocked
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
  
  it("Can resolve an issue successfully", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const contributorKeypair = anchor.web3.Keypair.generate();
    
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

    const contributorAirdrop = await provider.connection.requestAirdrop(
      contributorKeypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributorAirdrop,
      ...latestBlockhash2,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 4 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 4).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 4).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issue_book"),
        new BN(eventId + 4).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 4).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 4),
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
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add an issue
    const issues = [
      {
        issueId: new BN(1),
        resolvedStatus: false,
        contributor: null,
        points: new BN(100),
        resolvedAt: null,
      },
    ];

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Now resolve the issue
    await program.methods
      .resolveIssue(
        new BN(1),
        contributorKeypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check that the issue was resolved correctly
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    const resolvedIssue = issuesBook.issues[0];
    expect(resolvedIssue.resolvedStatus).to.be.true;
    expect(resolvedIssue.contributor.toString()).to.equal(contributorKeypair.publicKey.toString());
    expect(resolvedIssue.points.toNumber()).to.equal(100);
    expect(resolvedIssue.resolvedAt).to.not.be.null;

    // Check that the leaderboard was updated
    const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(1);
    expect(leaderboard.entries[0].contributor.toString()).to.equal(contributorKeypair.publicKey.toString());
    expect(leaderboard.entries[0].points.toNumber()).to.equal(100);

    console.log("✅ Issue resolved successfully!");
  });

  it("Can resolve multiple issues and accumulate points", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const contributorKeypair = anchor.web3.Keypair.generate();
    
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

    const contributorAirdrop = await provider.connection.requestAirdrop(
      contributorKeypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributorAirdrop,
      ...latestBlockhash2,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 5 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 5).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 5).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issue_book"),
        new BN(eventId + 5).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 5).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 5),
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
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add multiple issues
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

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Resolve first issue
    await program.methods
      .resolveIssue(
        new BN(1),
        contributorKeypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check leaderboard after first resolution
    let leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(1);
    expect(leaderboard.entries[0].points.toNumber()).to.equal(100);

    // Resolve second issue
    await program.methods
      .resolveIssue(
        new BN(2),
        contributorKeypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check leaderboard after second resolution
    leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(1); // Still only one entry
    expect(leaderboard.entries[0].points.toNumber()).to.equal(300); // 100 + 200

    // Resolve third issue
    await program.methods
      .resolveIssue(
        new BN(3),
        contributorKeypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check final leaderboard
    leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(1);
    expect(leaderboard.entries[0].points.toNumber()).to.equal(600); // 100 + 200 + 300

    // Check that all issues are resolved
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues[0].resolvedStatus).to.be.true;
    expect(issuesBook.issues[1].resolvedStatus).to.be.true;
    expect(issuesBook.issues[2].resolvedStatus).to.be.true;

    console.log("✅ Multiple issues resolved and points accumulated successfully!");
  });

  it("Cannot resolve an issue if not the maintainer", async () => {
    // Create maintainer and unauthorized user
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const unauthorizedUser = anchor.web3.Keypair.generate();
    const contributorKeypair = anchor.web3.Keypair.generate();
    
    // Give all some SOL for testing
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

    const contributorAirdrop = await provider.connection.requestAirdrop(
      contributorKeypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash3 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributorAirdrop,
      ...latestBlockhash3,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 6 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 6).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 6).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issue_book"),
        new BN(eventId + 6).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 6).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 6),
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
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add an issue
    const issues = [
      {
        issueId: new BN(1),
        resolvedStatus: false,
        contributor: null,
        points: new BN(100),
        resolvedAt: null,
      },
    ];

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Now unauthorized user tries to resolve the issue (this should fail)
    try {
      await program.methods
        .resolveIssue(
          new BN(1),
          contributorKeypair.publicKey
        )
        .accountsPartial({
          maintainer: unauthorizedUser.publicKey, // Wrong maintainer!
          event: eventAddress,
          issueBook: issuesBookAddress,
          leaderboard: leaderboardAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();

      // If we get here, the test should fail
      expect.fail("Expected transaction to fail - unauthorized user should not be able to resolve issues");
    } catch (error) {
      // This should happen - unauthorized access should be blocked
      const errorMessage = error.message;
      const isBlocked = errorMessage.includes("InvalidMaintainer") || 
                       errorMessage.includes("seeds constraint") ||
                       errorMessage.includes("AnchorError");
      expect(isBlocked).to.be.true;
      console.log("✅ Unauthorized resolution correctly blocked!");
    }

    // Verify that the issue was not resolved
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues[0].resolvedStatus).to.be.false;
    expect(issuesBook.issues[0].contributor).to.be.null;

    // Verify that the leaderboard was not updated
    const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(0);
  });

  it("Cannot resolve an issue with invalid issue ID", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const contributorKeypair = anchor.web3.Keypair.generate();
    
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

    const contributorAirdrop = await provider.connection.requestAirdrop(
      contributorKeypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributorAirdrop,
      ...latestBlockhash2,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 7 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 7).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 7).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issue_book"),
        new BN(eventId + 7).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 7).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 7),
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
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add an issue with ID 1
    const issues = [
      {
        issueId: new BN(1),
        resolvedStatus: false,
        contributor: null,
        points: new BN(100),
        resolvedAt: null,
      },
    ];

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Try to resolve an issue with invalid ID (999)
    try {
      await program.methods
        .resolveIssue(
          new BN(999), // Invalid issue ID
          contributorKeypair.publicKey
        )
        .accountsPartial({
          maintainer: maintainerKeypair.publicKey,
          event: eventAddress,
          issueBook: issuesBookAddress,
          leaderboard: leaderboardAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([maintainerKeypair])
        .rpc();

      // If we get here, the test should fail
      expect.fail("Expected transaction to fail - invalid issue ID should not be resolvable");
    } catch (error) {
      // This should happen - invalid issue ID should be blocked
      const errorMessage = error.message;
      const isBlocked = errorMessage.includes("InvalidIssueId") || 
                       errorMessage.includes("AnchorError");
      expect(isBlocked).to.be.true;
      console.log("✅ Invalid issue ID correctly blocked!");
    }

    // Verify that no issues were resolved
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues[0].resolvedStatus).to.be.false;
    expect(issuesBook.issues[0].contributor).to.be.null;

    // Verify that the leaderboard was not updated
    const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(0);
  });

  it("Cannot resolve an already resolved issue", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const contributorKeypair = anchor.web3.Keypair.generate();
    
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

    const contributorAirdrop = await provider.connection.requestAirdrop(
      contributorKeypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributorAirdrop,
      ...latestBlockhash2,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 8 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 8).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 8).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issue_book"),
        new BN(eventId + 8).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 8).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 8),
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
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add an issue
    const issues = [
      {
        issueId: new BN(1),
        resolvedStatus: false,
        contributor: null,
        points: new BN(100),
        resolvedAt: null,
      },
    ];

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Resolve the issue first time (should work)
    await program.methods
      .resolveIssue(
        new BN(1),
        contributorKeypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Try to resolve the same issue again (should fail)
    try {
      await program.methods
        .resolveIssue(
          new BN(1),
          contributorKeypair.publicKey
        )
        .accountsPartial({
          maintainer: maintainerKeypair.publicKey,
          event: eventAddress,
          issueBook: issuesBookAddress,
          leaderboard: leaderboardAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([maintainerKeypair])
        .rpc();

      // If we get here, the test should fail
      expect.fail("Expected transaction to fail - already resolved issue should not be resolvable again");
    } catch (error) {
      // This should happen - already resolved issue should be blocked
      const errorMessage = error.message;
      const isBlocked = errorMessage.includes("InvalidIssueId") || 
                       errorMessage.includes("AnchorError");
      expect(isBlocked).to.be.true;
      console.log("✅ Already resolved issue correctly blocked!");
    }

    // Verify that the issue remains resolved with original data
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues[0].resolvedStatus).to.be.true;
    expect(issuesBook.issues[0].contributor.toString()).to.equal(contributorKeypair.publicKey.toString());
    expect(issuesBook.issues[0].points.toNumber()).to.equal(100);

    // Verify that the leaderboard still has the correct points (not doubled)
    const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(1);
    expect(leaderboard.entries[0].points.toNumber()).to.equal(100);
  });

  it("Can resolve issues for different contributors", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const contributor1Keypair = anchor.web3.Keypair.generate();
    const contributor2Keypair = anchor.web3.Keypair.generate();
    
    // Give all some SOL for testing
    const maintainerAirdrop = await provider.connection.requestAirdrop(
      maintainerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: maintainerAirdrop,
      ...latestBlockhash,
    });

    const contributor1Airdrop = await provider.connection.requestAirdrop(
      contributor1Keypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributor1Airdrop,
      ...latestBlockhash2,
    });

    const contributor2Airdrop = await provider.connection.requestAirdrop(
      contributor2Keypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash3 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributor2Airdrop,
      ...latestBlockhash3,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 9 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 9).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 9).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issue_book"),
        new BN(eventId + 9).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 9).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 9),
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
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add multiple issues
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

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Resolve issue 1 for contributor 1
    await program.methods
      .resolveIssue(
        new BN(1),
        contributor1Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Resolve issue 2 for contributor 2
    await program.methods
      .resolveIssue(
        new BN(2),
        contributor2Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Resolve issue 3 for contributor 1 again
    await program.methods
      .resolveIssue(
        new BN(3),
        contributor1Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Check that all issues are resolved
    const issuesBook = await program.account.issueBook.fetch(issuesBookAddress);
    expect(issuesBook.issues[0].resolvedStatus).to.be.true;
    expect(issuesBook.issues[1].resolvedStatus).to.be.true;
    expect(issuesBook.issues[2].resolvedStatus).to.be.true;

    expect(issuesBook.issues[0].contributor.toString()).to.equal(contributor1Keypair.publicKey.toString());
    expect(issuesBook.issues[1].contributor.toString()).to.equal(contributor2Keypair.publicKey.toString());
    expect(issuesBook.issues[2].contributor.toString()).to.equal(contributor1Keypair.publicKey.toString());

    // Check that the leaderboard has correct entries
    const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(leaderboard.entries).to.have.length(2); // Two different contributors

    // Find contributor 1's entry
    const contributor1Entry = leaderboard.entries.find(
      entry => entry.contributor.toString() === contributor1Keypair.publicKey.toString()
    );
    expect(contributor1Entry).to.not.be.undefined;
    expect(contributor1Entry.points.toNumber()).to.equal(400); // 100 + 300

    // Find contributor 2's entry
    const contributor2Entry = leaderboard.entries.find(
      entry => entry.contributor.toString() === contributor2Keypair.publicKey.toString()
    );
    expect(contributor2Entry).to.not.be.undefined;
    expect(contributor2Entry.points.toNumber()).to.equal(200); // 200

    console.log("✅ Multiple contributors resolved issues successfully!");
  });

  it("Shows leaderboard functionality and display", async () => {
    // Create a new keypair for this test
    const maintainerKeypair = anchor.web3.Keypair.generate();
    const contributor1Keypair = anchor.web3.Keypair.generate();
    const contributor2Keypair = anchor.web3.Keypair.generate();
    const contributor3Keypair = anchor.web3.Keypair.generate();
    
    // Give all some SOL for testing
    const maintainerAirdrop = await provider.connection.requestAirdrop(
      maintainerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: maintainerAirdrop,
      ...latestBlockhash,
    });

    const contributor1Airdrop = await provider.connection.requestAirdrop(
      contributor1Keypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributor1Airdrop,
      ...latestBlockhash2,
    });

    const contributor2Airdrop = await provider.connection.requestAirdrop(
      contributor2Keypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash3 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributor2Airdrop,
      ...latestBlockhash3,
    });

    const contributor3Airdrop = await provider.connection.requestAirdrop(
      contributor3Keypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const latestBlockhash4 = await provider.connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature: contributor3Airdrop,
      ...latestBlockhash4,
    });

    // Create event data
    const startDate = 1700000000;
    const endDate = 1700000000 + 86400;
    const rewardsplit = [50, 30, 20];
    const rewardAmount = 1000000000;

    // Find account addresses (using eventId + 10 for uniqueness)
    const [eventAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("event"),
        maintainerKeypair.publicKey.toBuffer(),
        new BN(eventId + 10).toArrayLike(Buffer, "le", 8),
        Buffer.from(eventName)
      ],
      program.programId
    );

    const [vaultAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rewards_vault"),
        new BN(eventId + 10).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [issuesBookAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("issue_book"),
        new BN(eventId + 10).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    const [leaderboardAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("leaderboard"),
        new BN(eventId + 10).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );

    // Create the event
    await program.methods
      .createEvent(
        new BN(eventId + 10),
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
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Add multiple issues with different point values
    const issues = [
      {
        issueId: new BN(1),
        resolvedStatus: false,
        contributor: null,
        points: new BN(150),
        resolvedAt: null,
      },
      {
        issueId: new BN(2),
        resolvedStatus: false,
        contributor: null,
        points: new BN(300),
        resolvedAt: null,
      },
      {
        issueId: new BN(3),
        resolvedStatus: false,
        contributor: null,
        points: new BN(75),
        resolvedAt: null,
      },
      {
        issueId: new BN(4),
        resolvedStatus: false,
        contributor: null,
        points: new BN(200),
        resolvedAt: null,
      },
      {
        issueId: new BN(5),
        resolvedStatus: false,
        contributor: null,
        points: new BN(100),
        resolvedAt: null,
      },
    ];

    await program.methods
      .addIssue(issues)
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    // Helper function to display leaderboard
    const displayLeaderboard = async (title: string) => {
      const leaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
      console.log(`\n📊 ${title}`);
      console.log("=".repeat(50));
      
      if (leaderboard.entries.length === 0) {
        console.log("No entries yet");
        return;
      }

      // Sort entries by points (descending)
      const sortedEntries = [...leaderboard.entries].sort((a, b) => 
        b.points.toNumber() - a.points.toNumber()
      );

      console.log("Rank | Contributor (short) | Points");
      console.log("-".repeat(50));
      
      sortedEntries.forEach((entry, index) => {
        const rank = index + 1;
        const shortAddress = entry.contributor.toString().slice(0, 8) + "...";
        const points = entry.points.toNumber();
        console.log(`${rank.toString().padStart(4)} | ${shortAddress.padEnd(20)} | ${points}`);
      });
      console.log("=".repeat(50));
    };

    // Show initial leaderboard (should be empty)
    await displayLeaderboard("Initial Leaderboard");

    // Resolve issue 1 for contributor 1 (150 points)
    await program.methods
      .resolveIssue(
        new BN(1),
        contributor1Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    await displayLeaderboard("After Issue 1 Resolved");

    // Resolve issue 2 for contributor 2 (300 points)
    await program.methods
      .resolveIssue(
        new BN(2),
        contributor2Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    await displayLeaderboard("After Issue 2 Resolved");

    // Resolve issue 3 for contributor 3 (75 points)
    await program.methods
      .resolveIssue(
        new BN(3),
        contributor3Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    await displayLeaderboard("After Issue 3 Resolved");

    // Resolve issue 4 for contributor 1 again (200 points - should accumulate)
    await program.methods
      .resolveIssue(
        new BN(4),
        contributor1Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    await displayLeaderboard("After Issue 4 Resolved (Contributor 1 gets more points)");

    // Resolve issue 5 for contributor 2 again (100 points - should accumulate)
    await program.methods
      .resolveIssue(
        new BN(5),
        contributor2Keypair.publicKey
      )
      .accountsPartial({
        maintainer: maintainerKeypair.publicKey,
        event: eventAddress,
        issueBook: issuesBookAddress,
        leaderboard: leaderboardAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([maintainerKeypair])
      .rpc();

    await displayLeaderboard("Final Leaderboard");

    // Verify final leaderboard state
    const finalLeaderboard = await program.account.leaderboard.fetch(leaderboardAddress);
    expect(finalLeaderboard.entries).to.have.length(3);

    // Find and verify each contributor's points
    const contributor1Final = finalLeaderboard.entries.find(
      entry => entry.contributor.toString() === contributor1Keypair.publicKey.toString()
    );
    expect(contributor1Final.points.toNumber()).to.equal(350); // 150 + 200

    const contributor2Final = finalLeaderboard.entries.find(
      entry => entry.contributor.toString() === contributor2Keypair.publicKey.toString()
    );
    expect(contributor2Final.points.toNumber()).to.equal(400); // 300 + 100

    const contributor3Final = finalLeaderboard.entries.find(
      entry => entry.contributor.toString() === contributor3Keypair.publicKey.toString()
    );
    expect(contributor3Final.points.toNumber()).to.equal(75); // 75

    console.log("\n✅ Leaderboard functionality demonstrated successfully!");
    console.log("📈 Final Rankings:");
    console.log("1. Contributor 2: 400 points");
    console.log("2. Contributor 1: 350 points");
    console.log("3. Contributor 3: 75 points");
  });
  
});