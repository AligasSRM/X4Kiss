(() => {
  "use strict";

  // X4Kiss Worker API host. This is the API backend, not the ElasticLake storage endpoint.
  const API_BASE = "https://x4kiss.srourr-ali73.workers.dev";
  const SESSION_KEY = "x4keys_session_token";
  const LEGACY_SESSION_KEY = "xkiss_session_token";

  class ApiError extends Error {
    constructor(message, status = 0, code = "api_error") {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
    }
  }

  function getSessionToken() {
    try {
      const currentToken = window.sessionStorage.getItem(SESSION_KEY);
      if (currentToken) return currentToken;

      const legacyToken = window.sessionStorage.getItem(LEGACY_SESSION_KEY) || "";
      if (!legacyToken) return "";

      // Preserve the legacy token if migration cannot be written.
      try {
        window.sessionStorage.setItem(SESSION_KEY, legacyToken);
        window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
      } catch {
        // The token can still be used for this request; do not expose it in logs.
      }
      return legacyToken;
    } catch {
      return "";
    }
  }

  function messageForError(error, serviceName) {
    if (!(error instanceof ApiError)) {
      return serviceName + " request failed.";
    }

    if (error.code === "network_error") return serviceName + " unreachable (network error).";
    if (error.code === "invalid_json") return serviceName + " returned an invalid response.";
    if (error.status === 401 || error.status === 403) return "Sign in again to access " + serviceName.toLowerCase() + ".";
    if (error.status === 404) return serviceName + " endpoint not found (404).";
    if (error.status === 429) return serviceName + " is rate-limited. Try again later.";
    if (error.status >= 500) return serviceName + " server error (" + error.status + ").";
    if (error.status) return serviceName + " request failed (" + error.status + ").";
    return serviceName + " request failed.";
  }

  async function getJSON(path) {
    const token = getSessionToken();
    let response;

    try {
      response = await fetch(API_BASE + path, {
        headers: {
          Accept: "application/json",
          ...(path === "/api/creator/videos" && token
            ? { Authorization: "Bearer " + token }
            : {}),
        },
        cache: "no-store",
      });
    } catch {
      throw new ApiError("Network request failed.", 0, "network_error");
    }

    if (!response.ok) {
      throw new ApiError("API request failed.", response.status, "http_error");
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError("Invalid JSON response.", response.status, "invalid_json");
    }

    return data;
  }

  function setSystemStatus(kind, label) {
    const status = document.getElementById("system-status");
    const roadmapStorage = document.getElementById("roadmap-storage");
    if (!status || !roadmapStorage) return;

    status.classList.toggle("ready", kind === "ready");
    status.setAttribute("aria-live", "polite");
    const indicator = status.querySelector("span");
    if (indicator) {
      indicator.style.background = kind === "ready" ? "#61d18b" : kind === "error" ? "#e06b6b" : "#d6ad5c";
      status.replaceChildren(indicator, document.createTextNode(" " + label));
    } else {
      status.textContent = label;
    }
    roadmapStorage.textContent = label;
  }

  function setStorageStatus(state, detail, systemKind, systemLabel) {
    const stateElement = document.getElementById("storage-state");
    const detailElement = document.getElementById("storage-detail");
    if (stateElement) stateElement.textContent = state;
    if (detailElement) detailElement.textContent = detail;
    setSystemStatus(systemKind, systemLabel);
  }

  async function loadLibrary() {
    const count = document.getElementById("video-count");
    const detail = document.getElementById("video-count-detail");
    if (!count) return;

    count.textContent = "…";
    if (detail) detail.textContent = "Checking creator library…";
    try {
      const library = await getJSON("/api/creator/videos");
      if (library.ok !== true || !Array.isArray(library.videos)) {
        count.textContent = "—";
        if (detail) detail.textContent = "Library response is invalid; video count is unavailable.";
        return;
      }
      count.textContent = String(library.videos.length);
      if (detail) detail.textContent = "Library endpoint responded; full owner-scoped library flow remains to be verified.";
    } catch (error) {
      count.textContent = "—";
      if (detail) detail.textContent = messageForError(error, "Creator library");
    }
  }

  async function loadHealth() {
    try {
      const health = await getJSON("/api/health");
      if (health.status !== "online") {
        setStorageStatus("Unknown", "Health endpoint responded, but status is not online.", "pending", "System status unconfirmed");
        return;
      }

      // storageReady is a health flag, not proof of a fresh write/read test.
      if (health.storageReady === true) {
        setStorageStatus("Reported ready", "Worker reports storage ready; a fresh live storage self-test has not been run here.", "pending", "Worker online · storage reported ready, not independently verified");
      } else {
        setStorageStatus("Pending", "Worker online; storage is not reported ready.", "pending", "Worker online · storage pending");
      }
    } catch (error) {
      const detail = messageForError(error, "Health check");
      const state = error instanceof ApiError && error.status === 404 ? "Route missing" : "Unavailable";
      setStorageStatus(state, detail, "error", detail);
    }
  }

  function setWalletUnavailable(message) {
    const pending = document.getElementById("wallet-pending");
    const available = document.getElementById("wallet-available");
    const payout = document.getElementById("payout-state");
    const pendingDetail = document.getElementById("wallet-pending-detail");
    const availableDetail = document.getElementById("wallet-available-detail");
    const payoutDetail = document.getElementById("payout-detail");
    const roadmapWallet = document.getElementById("roadmap-wallet");

    if (pending) pending.textContent = "—";
    if (available) available.textContent = "—";
    if (payout) payout.textContent = "Not active";
    if (pendingDetail) pendingDetail.textContent = message || "Balance data endpoint not connected";
    if (availableDetail) availableDetail.textContent = "No verified settlement balance available";
    if (payoutDetail) payoutDetail.textContent = "Payouts remain disabled";
    if (roadmapWallet) roadmapWallet.textContent = "Not verified";
  }

  async function loadWallet() {
    try {
      const ledger = await getJSON("/api/wallet/ledger/status");

      // This endpoint only reports ledger readiness; it does not return balances.
      // Never infer balances, settlement, or payout readiness from storageReady.
      if (ledger && ledger.ok === true) {
        setWalletUnavailable("Ledger status endpoint responded; balance data is not wired.");
      } else {
        setWalletUnavailable("Ledger status is not verified.");
      }
    } catch (error) {
      setWalletUnavailable(messageForError(error, "Wallet status"));
    }
  }

  async function loadDashboard() {
    // Keep independent services independent: one failed request must not erase
    // successful results from another service.
    await Promise.allSettled([loadLibrary(), loadHealth(), loadWallet()]);

    const liveCount = document.getElementById("live-count");
    const liveDetail = document.getElementById("live-count-detail");
    if (liveCount) liveCount.textContent = "—";
    if (liveDetail) liveDetail.textContent = "Live-room count endpoint is not connected to this dashboard.";
  }

  window.addEventListener("DOMContentLoaded", loadDashboard);
})();