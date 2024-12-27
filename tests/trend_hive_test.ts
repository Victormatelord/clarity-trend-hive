import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Test posting new trend",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('trend_hive', 'post-trend', [
        types.utf8("Summer Neon"),
        types.utf8("Bright neon colors are making a comeback"),
        types.utf8("https://example.com/neon.jpg"),
        types.utf8("Color Trends")
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(0);
    
    // Verify trend details
    let trendBlock = chain.mineBlock([
      Tx.contractCall('trend_hive', 'get-trend', [
        types.uint(0)
      ], wallet1.address)
    ]);
    
    const trend = trendBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(trend['title'], types.utf8("Summer Neon"));
    assertEquals(trend['votes'], types.uint(0));
  },
});

Clarinet.test({
  name: "Test upvoting trend",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // First post a trend
    let postBlock = chain.mineBlock([
      Tx.contractCall('trend_hive', 'post-trend', [
        types.utf8("Test Trend"),
        types.utf8("Description"),
        types.utf8("https://example.com/test.jpg"),
        types.utf8("Test Category")
      ], wallet1.address)
    ]);
    
    // Then upvote it
    let upvoteBlock = chain.mineBlock([
      Tx.contractCall('trend_hive', 'upvote-trend', [
        types.uint(0)
      ], wallet2.address)
    ]);
    
    upvoteBlock.receipts[0].result.expectOk().expectBool(true);
    
    // Verify vote count increased
    let trendBlock = chain.mineBlock([
      Tx.contractCall('trend_hive', 'get-trend', [
        types.uint(0)
      ], wallet1.address)
    ]);
    
    const trend = trendBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(trend['votes'], types.uint(1));
  },
});

Clarinet.test({
  name: "Test double voting prevention",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // Post trend
    chain.mineBlock([
      Tx.contractCall('trend_hive', 'post-trend', [
        types.utf8("Test Trend"),
        types.utf8("Description"),
        types.utf8("https://example.com/test.jpg"),
        types.utf8("Test Category")
      ], wallet1.address)
    ]);
    
    // Vote once
    let vote1Block = chain.mineBlock([
      Tx.contractCall('trend_hive', 'upvote-trend', [
        types.uint(0)
      ], wallet2.address)
    ]);
    
    // Try to vote again
    let vote2Block = chain.mineBlock([
      Tx.contractCall('trend_hive', 'upvote-trend', [
        types.uint(0)
      ], wallet2.address)
    ]);
    
    vote1Block.receipts[0].result.expectOk();
    vote2Block.receipts[0].result.expectErr(types.uint(102)); // err-already-voted
  },
});