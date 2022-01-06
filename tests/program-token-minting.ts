import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { ProgramTokenMinting } from '../target/types/program_token_minting';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { assert } from 'chai';

describe('program-token-minting', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ProgramTokenMinting as Program<ProgramTokenMinting>;

  const airdropAmount = 1_000_000_000;
  const mintAmount = 100;

  const payer = anchor.web3.Keypair.generate();
  const mintA = anchor.web3.Keypair.generate();
  const payerMintATokenAccount = anchor.web3.Keypair.generate();

  it('Airdrops SOL to payer', async () => {
    console.log("Airdropping SOL");

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, airdropAmount),
      "confirmed"
    );
    
    let balance = await provider.connection.getBalance(payer.publicKey);

    assert.equal(airdropAmount, balance);

  });

  it('Creates a Mint', async () => {
    await program.rpc.createMint({
      accounts: {
        mint: mintA.publicKey,
        payer: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [payer, mintA]
    });

    let account_owner = await (await provider.connection.getAccountInfo(mintA.publicKey)).owner;

    assert.equal(TOKEN_PROGRAM_ID.toString(), account_owner.toString());
  });

  it('Creates a Token Account for the Mint', async () => {
    await program.rpc.createTokenAccount({
      accounts: {
        token: payerMintATokenAccount.publicKey,
        mint: mintA.publicKey,
        authority: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [payer, payerMintATokenAccount]
    });

    let accountInfo = await provider.connection.getParsedAccountInfo(payerMintATokenAccount.publicKey);

    let accountInfoMint = accountInfo.value.data["parsed"]["info"]["mint"];
    let accountInfoOwner = accountInfo.value.data["parsed"]["info"]["owner"];

    assert.equal(mintA.publicKey.toString(), accountInfoMint);
    assert.equal(payer.publicKey.toString(), accountInfoOwner);
    
  });
 
  it('Mints new tokens to account', async () => {
    await program.rpc.mintTokens(new anchor.BN(mintAmount), {
      accounts: {
        token: payerMintATokenAccount.publicKey,
        mint: mintA.publicKey,
        mintAuthority: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [payer]
    });

    let balance = await (await provider.connection.getTokenAccountBalance(payerMintATokenAccount.publicKey)).value.amount;
    assert.equal(mintAmount, balance);
  }); 
});
