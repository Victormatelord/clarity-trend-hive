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
    assertEquals(trend['active'], types.bool(true));
  },
});

Clarinet.test({
  name: "Test empty input validation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('trend_hive', 'post-trend', [
        types.utf8(""),
        types.utf8("Description"),
        types.utf8("https://example.com/test.jpg"),
        types.utf8("Test Category")
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectErr(types.uint(105));
  },
});

Clarinet.test({
  name: "Test creator cannot vote on own trend",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    // Post trend
    chain.mineBlock([
      Tx.contractCall('trend_hive', 'post-trend', [
        types.utf8("Test Trend"),
        types.utf8("Description"),
        types.utf8("https://example.com/test.jpg"),
        types.utf8("Test Category")
      ], wallet1.address)
    ]);
    
    // Try to vote on own trend
    let voteBlock = chain.mineBlock([
      Tx.contractCall('trend_hive', 'upvote-trend', [
        types.uint(0)
      ], wallet1.address)
    ]);
    
    voteBlock.receipts[0].result.expectErr(types.uint(104));
  },
});

Clarinet.test({
  name: "Test trend moderation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
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
    
    // Moderate trend (deactivate)
    let moderateBlock = chain.mineBlock([
      Tx.contractCall('trend_hive', 'moderate-trend', [
        types.uint(0),
        types.bool(false)
      ], deployer.address)
    ]);
    
    moderateBlock.receipts[0].result.expectOk().expectBool(true);
    
    // Try to vote on deactivated trend
    let voteBlock = chain.mineBlock([
      Tx.contractCall('trend_hive', 'upvote-trend', [
        types.uint(0)
      ], wallet2.address)
    ]);
    
    voteBlock.receipts[0].result.expectErr(types.uint(103));
  },
});
