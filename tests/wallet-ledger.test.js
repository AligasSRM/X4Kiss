import test from "node:test";
import assert from "node:assert/strict";
import {
  createWalletLedgerKey,
  storeWalletEntry,
  getWalletEntry
} from "../wallet/wallet-ledger-store.js";

function makeKv() {
  const data = new Map();
  return {
    data,
    async get(key, type) {
      const value = data.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      data.set(key, value);
    }
  };
}

const validEntry = () => ({
  entryId: "entry-test-001",
  creatorId: "creator-test-001",
  type: "earning",
  amount: 12.5,
  currency: "USD",
  balanceType: "pending",
  referenceId: "reference-test-001",
  occurredAt: "2026-10-14T12:00:00.000Z"
});

test("wallet ledger keys are scoped by creator and entry", () => {
  assert.equal(
    createWalletLedgerKey({ creatorId: "creator-1", entryId: "entry-1" }),
    "wallet-ledger:creator-1:entry-1"
  );
  assert.notEqual(
    createWalletLedgerKey({ creatorId: "creator-1", entryId: "entry-1" }),
    createWalletLedgerKey({ creatorId: "creator-2", entryId: "entry-1" })
  );
});

test("stores a valid entry and reads it back", async () => {
  const env = { XKISS_WALLET_LEDGER: makeKv() };
  const entry = validEntry();

  const write = await storeWalletEntry(env, entry);
  const read = await getWalletEntry(env, entry);

  assert.equal(write.ok, true);
  assert.equal(write.status, "stored");
  assert.equal(write.recorded, true);
  assert.equal(read.status, "found");
  assert.equal(read.entry.entryId, entry.entryId);
  assert.equal(read.entry.creatorId, entry.creatorId);
  assert.equal(read.entry.amount, entry.amount);
});

test("does not record the same creator/entry key twice", async () => {
  const env = { XKISS_WALLET_LEDGER: makeKv() };
  const entry = validEntry();

  const first = await storeWalletEntry(env, entry);
  const second = await storeWalletEntry(env, entry);

  assert.equal(first.status, "stored");
  assert.equal(first.recorded, true);
  assert.equal(second.status, "duplicate");
  assert.equal(second.recorded, false);
  assert.equal(env.XKISS_WALLET_LEDGER.data.size, 1);
});

test("fails closed when wallet storage is not configured", async () => {
  const entry = validEntry();

  assert.equal((await storeWalletEntry({}, entry)).status, "storage-not-ready");
  assert.equal((await getWalletEntry({}, entry)).status, "storage-not-ready");
});

test("rejects missing creator ID, entry ID, invalid amount, and unsupported ledger type", async (t) => {
  const invalidEntries = [
    { ...validEntry(), creatorId: "" },
    { ...validEntry(), entryId: "" },
    { ...validEntry(), amount: 0 },
    { ...validEntry(), amount: -5 },
    { ...validEntry(), amount: "not-a-number" },
    { ...validEntry(), type: "arbitrary" },
    { ...validEntry(), balanceType: "unknown" }
  ];

  for (const entry of invalidEntries) {
    await t.test(JSON.stringify({
      creatorId: entry.creatorId,
      entryId: entry.entryId,
      amount: entry.amount,
      type: entry.type,
      balanceType: entry.balanceType
    }), async () => {
      const env = { XKISS_WALLET_LEDGER: makeKv() };
      const result = await storeWalletEntry(env, entry);
      assert.equal(result.ok, false, "invalid wallet ledger data must be rejected");
      assert.equal(env.XKISS_WALLET_LEDGER.data.size, 0, "invalid entries must not be persisted");
    });
  }
});
