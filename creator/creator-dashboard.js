(() => {
  "use strict";

  // This deployed Worker is the dashboard's existing API backend.
  // It is not the storage provider; uploaded-object storage is ElasticLake.
  const API_BASE = "https://xkiss.srourr-ali73.workers.dev";
  const SESSION_KEY = "xkiss_session_token";

  async function getJSON(path) {
    const token = window.sessionStorage.getItem(SESSION_KEY) || "";
    const response = await fetch(API_BASE + path, {
      headers: {
        Accept: "application/json",
        ...(path === "/api/creator/videos"
          ? { Authorization: "Bearer " + token }
          : {}),
      },
      cache: "no-store",
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("The API returned an invalid JSON response.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  function setSystemReady(ready) {
    const status = document.getElementById("system-status");
    const roadmapStorage = document.getElementById("roadmap-storage");

    status.classList.toggle("ready", Boolean(ready));
    status.innerHTML = ready
      ? "<span></span> ElasticLake connected"
      : "<span></span> ElasticLake pending";

    roadmapStorage.textContent = ready
      ? "Connected"
      : "ElasticLake pending";
  }

  function setWalletNotConnected() {
    document.getElementById("wallet-pending").textContent = "—";
    document.getElementById("wallet-available").textContent = "—";
    document.getElementById("payout-state").textContent = "Not active";
    document.getElementById("wallet-pending-detail").textContent =
      "Wallet ledger not connected";
    document.getElementById("wallet-available-detail").textContent =
      "Settlement not connected";
    document.getElementById("payout-detail").textContent =
      "Payout layer disabled";
    document.getElementById("roadmap-wallet").textContent = "Prepared";
  }

  async function loadWallet() {
    try {
      const ledger = await getJSON("/api/wallet/ledger/status");

      if (ledger.storageReady) {
        document.getElementById("wallet-pending-detail").textContent =
          "Ledger connected";
        document.getElementById("wallet-available-detail").textContent =
          "Ledger connected";
        document.getElementById("payout-detail").textContent =
          "Eligibility layer ready";
        document.getElementById("roadmap-wallet").textContent = "Connected";
        return;
      }
    } catch {
      // Keep wallet values blank when the API is unavailable.
    }

    setWalletNotConnected();
  }

  async function loadDashboard() {
    try {
      const [library, health] = await Promise.all([
        getJSON("/api/creator/videos"),
        getJSON("/api/health"),
      ]);

      const videos = Array.isArray(library.videos) ? library.videos : [];
      document.getElementById("video-count").textContent = String(videos.length);

      // No live-room endpoint is wired here; do not present a fabricated count.
      document.getElementById("live-count").textContent = "—";

      const storageReady = health.storageReady === true;
      document.getElementById("storage-state").textContent = storageReady
        ? "Ready"
        : "Pending";
      document.getElementById("storage-detail").textContent = storageReady
        ? "ElasticLake connected"
        : "ElasticLake not connected";

      setSystemReady(storageReady);
    } catch {
      document.getElementById("video-count").textContent = "—";
      document.getElementById("live-count").textContent = "—";
      document.getElementById("storage-state").textContent = "Offline";
      document.getElementById("storage-detail").textContent =
        "API status unavailable";

      const status = document.getElementById("system-status");
      status.classList.remove("ready");
      status.innerHTML = "<span></span> API unavailable";
      document.getElementById("roadmap-storage").textContent =
        "Status unavailable";
    }

    await loadWallet();
  }

  window.addEventListener("DOMContentLoaded", loadDashboard);
})();