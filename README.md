# program-token-minting

# Token Accounts in Anchor

This page will detail what I’m doing when it comes to building out the example project from this youtube video:

[https://youtu.be/FmdPAwsqJC4?t=3168](https://youtu.be/FmdPAwsqJC4?t=3168)

We will call this example program-token-minting.

We do a basic

```bash
anchor init program-token-minting
```

Then we run the test to grab and compile all the dependencies and make sure the initial program creation worked

```bash
anchor test
```

this takes a bit to compile everything...

And our test passes, it’s all set up correctly.

I jump into the programs/Cargo.toml and notice the anchor-lang dependency is actually an outdated version (0.18.2). Lets update that to the current latest (0.19.0). 

We will also need the anchor-spl dependency so lets add that as well. It’s the same version as the anchor-lang crate (0.19.0).

lets run the test again so it can grab the updated dependencies and make sure our test still works.

```bash
anchor test
```

Everthing still works, Perfect!

Lets continue.

Next, we rename our intialize function to create_mint and we rename our Initialize Context struct to CreateMint.

Update the typescript test code to call the create_mint function instead of initialize.

Remember that the IDL will generate a createMint function that we call in typescript, not create_mint.

run ‘anchor test’ to make sure everything is working properly.

Now lets create the actual Accounts data inside our CreateMint Context like so:

```rust
#[derive(Accounts)]
pub struct CreateMint<'info>
	#[account(
		init,
		payer = payer,
		mint::decimals = 6,
		mint::authority = payer,
	)]
	pub mint: Account<'info, Mint>,
	#[account(signer)]
	pub payer: AccountInfo<'info>,
	#[account(address = system_program::ID)]
	pub system_program: AccountInfo<'info>,
	#[account(address = token::ID)]
	pub token_program: AccountInfo<'info>,
	pub rent: Sysvar<'info, Rent>,
}
```

I won’t explain everything that’s going on here, refer to the linked video that we are building this from for the explanations.

Now lets create the typescript test code

```tsx
...
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
...
const payer = anchor.web3.Keypair.generate();
const mintA = anchor.web3.Keypair.generate();
...

it('Creates a Mint', async () => {
    const tx = await program.rpc.createMint({
      accounts: {
        mint: mintA.publicKey,
        payer: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [payer, mintA]
    });
    console.log("Your transaction signature", tx);
  });
```

If the ‘@solana/spl-token’ doesn’t exist for you, we can download it using npm:

```bash
npm install --save @solana/spl-token
```

Ok, lets run our test and see if it works.

And Nope! We get the following error:

```bash
Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: Cross-program invocation with unauthorized signer or writable account
```

Ah yes, the CPI unauthorized signer or writable account error. We know that the signers are correct. payer has to sign since they are the one paying. mintA has to sign because the account is being initialized for that key. So it must be the writable account error again..

That’s an easy fix honestly, we just need to make sure any accounts that are being modified in any way are declared as mutable.

lets update our CreateMint Context because we forgot to mark one of the accounts as mut

```rust
#[derive(Accounts)]
pub struct CreateMint<'info>
	#[account(
		init,
		payer = payer,
		mint::decimals = 6,
		mint::authority = payer,
	)]
	pub mint: Account<'info, Mint>,
	#[account(signer, mut)]     // <----- We need this mut attribute for the payer
	pub payer: AccountInfo<'info>,
	#[account(address = system_program::ID)]
	pub system_program: AccountInfo<'info>,
	#[account(address = token::ID)]
	pub token_program: AccountInfo<'info>,
	pub rent: Sysvar<'info, Rent>,
}
```

Ok we fixed the writable error now lets test again.

And Nope! We get another error... 😆

This error is different though

```bash
Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x1
```

Honestly idk wtf that means... But if we scroll up a bit we can see some error logs that tell us the actual problem.

```bash
logs: [
	'Program Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS invoke [1]',
	'Program log: Instruction: CreateMint',
	'Program 11111111111111111111111111111111 invoke [2]',
	'Transfer: insufficient lamports 0, need 1461600',
	...
]
```

Ah, perfect! Insufficient lamports. Duh the payer doesn’t have any Sol to pay for the account creation!

Lets create a simple test for airdropping some Sol to the payer

```tsx
...
import { assert } from 'chai';

...
// Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);
...

it('Airdrops SOL to payer', async () => {
    console.log("Airdropping SOL");

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, airdropAmount),
      "confirmed"
    );
    
    let balance = await provider.connection.getBalance(payer.publicKey);

    assert.equal(airdropAmount, balance);

  });
```

You will need to add some imports and store the provider env as a variable so we can use it here easily.

We run our tests and...

It works!!!

Now lets update our ‘Creates a Mint’ test to ensure that the account has been created and is owned by the Token Program. When you generate a keypair it will have no owner initially so the value of owner will be null and if you try to read it you get errors. If you airdrop some sol to the generated keys public key it will create an account owned by the SystemProgram ‘11111111111111111111111111111111’ If we create an account with a program the account owner will be that program. 

Don’t mistake the account creator program as the program sending the CPI. The owner is the program that actually creates the account at the end of the CPI calls.

So basically we just want to assert that the owner of the mintA account is indeed the Token Program. Here is our updated code:

```rust
it('Creates a Mint', async () => {
    ...

    let account_owner = await (await provider.connection.getAccountInfo(mintA.publicKey)).owner;

    assert.equal(TOKEN_PROGRAM_ID.toString(), account_owner.toString());
  });
```

We run our test, and everything works!

Now lets clean up some of these unnecessary AccountInfo usages and update our code for following best practices.

Here is our new CreateMint Context struct:

```rust
#[derive(Accounts)]
pub struct CreateMint<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = payer,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
```

Run ‘anchor test’ to make sure everything still works 🙂

Next up we have the create_token_account function and Context

Simple enough:

```rust
#[program]
pub mod program_token_minting {
    ...

    pub fn create_token_account(_ctx: Context<CreateTokenAccount>) -> ProgramResult {
        Ok(())
    }
}

...

#[derive(Accounts)]
pub struct CreateTokenAccount<'info> {
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = authority,
    )]
    pub token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
		#[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
```

Here we stick with best practices and don’t need any AccountInfo Types.

Lets create a basic test for sending the transaction:

```tsx
...
const payerMintATokenAccount = anchor.web3.Keypair.generate();
...

it('Creates a Token Account for the Mint', async () => {
    const tx = await program.rpc.createTokenAccount({
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
```

The transaction succeeds, but I’m not verifying that the account is of the correct mint type. I’m having trouble getting this Keypair to be used as a solana/spl-token type so I can check the mint PublicKey and other data.

There has to be some way to read the data in an account to check the mint and stuff.

I found what I was looking for 🙂

[https://solanacookbook.com/recipes/token.html#create-token](https://solanacookbook.com/recipes/token.html#create-token)

Here is the assert code

```tsx
it('Creates a Token Account for the Mint', async () => {
    ...
		let accountInfo = await provider.connection.getParsedAccountInfo(payerMintATokenAccount.publicKey);

    let accountInfoMint = accountInfo.value.data["parsed"]["info"]["mint"];
    let accountInfoOwner = accountInfo.value.data["parsed"]["info"]["owner"];

    assert.equal(mintA.publicKey.toString(), accountInfoMint);
    assert.equal(payer.publicKey.toString(), accountInfoOwner);
});
```

Now for the last piece. Minting some tokens to the account.

Let’s create our mint_tokens function:

```rust
pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> ProgramResult {
        token::mint_to((&*ctx.accounts).into(), amount)
    }
```

Next we create our MintTokens context

```rust
#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut, has_one = mint)]
    pub token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    pub mint_authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
```

Now this part looks complicated but it just allows us to convert from one type to another. This way we can easily convert from MintTokens context to the MintTo CpiContext by just calling .into() on it:

```rust
impl<'info> From<&MintTokens<'info>> for CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
    fn from(accs: &MintTokens<'info>) -> Self {
        let cpi_program = accs.token_program.to_account_info();
        let cpi_accounts = MintTo {
            mint: accs.mint.to_account_info(),
            to: accs.token.to_account_info(),
            authority: accs.mint_authority.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
```

That’s it for our Solana Program! 🥳

Finally, we just need to implement our mint_tokens test:

```tsx
...
const mintAmount = 100;
...

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
```

And that’s it!
