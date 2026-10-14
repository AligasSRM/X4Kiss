import { isStorageReady, storeJsonObject, getJsonObject } from "../storage/elasticlake-adapter.js";

const WALLET_LEDGER_PREFIX = "wallet-ledger:";
const WALLET_ENTRY_TYPES = new Set([
  "earning", "refund", "chargeback", "payout", "payout_reversal", "adjustment"
]);
const WALLET_BALANCE_TYPES = new Set(["available", "pending"]);

export function isWalletLedgerReady(env) {
  return Boolean(env && (env.XKISS_WALLET_LEDGER || isStorageReady(env)));
}

function clean(value) {
  return String(value ?? "").trim();
}

function validateWalletEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return "Wallet entry must be an object.";
  }
  if (!clean(entry.creatorId)) return "creatorId is required.";
  if (!clean(entry.entryId)) return "entryId is required.";
  if (!WALLET_ENTRY_TYPES.has(clean(entry.type))) return "Unsupported wallet entry type.";
  const amount = Number(entry.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Wallet entry amount must be a finite number greater than zero.";
  if (!WALLET_BALANCE_TYPES.has(clean(entry.balanceType))) return "balanceType must be available or pending.";
  if (entry.currency != null && clean(entry.currency) !== "USD") return "Only USD wallet entries are supported.";
  return null;
}

export function createWalletLedgerKey(input = {}) {
  return WALLET_LEDGER_PREFIX + [clean(input.creatorId), clean(input.entryId)].join(":");
}

function invalidResult(message) {
  return { ok: false, storageReady: false, status: "invalid-input", recorded: false, message };
}

function buildRecord(entry) {
  return {
    entryId: clean(entry.entryId),
    creatorId: clean(entry.creatorId),
    type: clean(entry.type),
    amount: Number(entry.amount),
    currency: clean(entry.currency || "USD"),
    balanceType: clean(entry.balanceType),
    referenceId: clean(entry.referenceId),
    occurredAt: entry.occurredAt || null,
    storedAt: new Date().toISOString()
  };
}

export async function storeWalletEntry(env, entry) {
  const validationError = validateWalletEntry(entry);
  if (validationError) return invalidResult(validationError);

  if (!isWalletLedgerReady(env)) {
    return {
      ok: false, storageReady: false, status: "storage-not-ready",
      recorded: false, message: "Wallet ledger storage is not connected yet."
    };
  }

  const key = createWalletLedgerKey(entry);
  const record = buildRecord(entry);

  if (env.XKISS_WALLET_LEDGER) {
    const existing = await env.XKISS_WALLET_LEDGER.get(key);
    if (existing) {
      return { ok: true, storageReady: true, status: "duplicate", recorded: false, key, storage: "XKISS_WALLET_LEDGER" };
    }
    await env.XKISS_WALLET_LEDGER.put(key, JSON.stringify(record));
    return { ok: true, storageReady: true, status: "stored", recorded: true, key, storage: "XKISS_WALLET_LEDGER" };
  }

  const existing = await getJsonObject(env, key);
  if (existing.value) {
    return { ok: true, storageReady: true, status: "duplicate", recorded: false, key, storage: "ElasticLake" };
  }
  await storeJsonObject(env, key, record);
  return { ok: true, storageReady: true, status: "stored", recorded: true, key, storage: "ElasticLake" };
}

export async function getWalletEntry(env, entry) {
  const validationError = validateWalletEntryLookup(entry);
  if (validationError) return { ok: false, storageReady: false, status: "invalid-input", message: validationError };

  if (!isWalletLedgerReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready" };
  }

  const key = createWalletLedgerKey(entry);
  if (env.XKISS_WALLET_LEDGER) {
    const value = await env.XKISS_WALLET_LEDGER.get(key, "json");
    return { ok: true, storageReady: true, status: value ? "found" : "not-found", key, entry: value || null, storage: "XKISS_WALLET_LEDGER" };
  }

  const result = await getJsonObject(env, key);
  return { ok: true, storageReady: true, status: result.value ? "found" : "not-found", key, entry: result.value || null, storage: "ElasticLake" };
}

function validateWalletEntryLookup(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "Wallet lookup must be an object.";
  if (!clean(entry.creatorId)) return "creatorId is required.";
  if (!clean(entry.entryId)) return "entryId is required.";
  return null;
}
