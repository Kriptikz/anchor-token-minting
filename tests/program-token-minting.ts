import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { ProgramTokenMinting } from '../target/types/program_token_minting';

describe('program-token-minting', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.ProgramTokenMinting as Program<ProgramTokenMinting>;

  it('Create a Mint', async () => {
    const tx = await program.rpc.createMint({});
    console.log("Your transaction signature", tx);
  });
});
