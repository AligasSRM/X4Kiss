(() => {
  "use strict";

  const API_BASE = "https://x4kiss-backend-neon.onrender.com";

  async function getJSON(path) {
    const token = window.sessionStorage.getItem("xkiss_session_token") || "";
    const response = await fetch(API_BASE + path, {
      headers: {
        Accept: "application/json",
        ...(path === "/api/creator/videos"
          ? { Authorization: "Bearer " + token }
          : {})
      },
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }

  function setSystemReady(verified) {
    const pill = document.getElementById("system-status");
    const roadmap = document.getElementById("roadmap-storage");
    if (!pill || !roadmap) return;

    if (verified) {
      pill.classList.add("ready");
      pill.innerHTML = "<span></span> Storage verified";
      roadmap.textContent = "Verified";
    } else {
      pill.classList.remove("ready");
      pill.innerHTML = "<span></span> ElasticLake verification pending";
      roadmap.textContent = "Verification pending";
    }
  }

  function setWalletNotConnected() {
    const values = {
      "wallet-pending": "—",
      "wallet-available": "—",
      "payout-state": "Not active",
      "wallet-pending-detail": "Wallet ledger not connected",
      "wallet-available-detail": "Settlement not connected",
      "payout-detail": "Payout layer disabled",
      "roadmap-wallet": "Prepared"
    };
    for (const [id, value] of Object.entries(values)) {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    }
  }

  async function loadWallet() {
    try {
      const ledger = await getJSON("/api/wallet/ledger/status");
      if (ledger.verified === true) {
        const values = {
          "wallet-pending-detail": "Ledger verified",
          "wallet-available-detail": "Ledger verified",
          "payout-detail": "Eligibility layer ready",
          "roadmap-wallet": "Verified"
        };
        for (const [id, value] of Object.entries(values)) {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        }
      } else {
        setWalletNotConnected();
      }
    } catch {
      setWalletNotConnected();
    }
  }

  async function loadDashboard() {
    try {
      const [library, health] = await Promise.all([
        getJSON("/api/creator/videos"),
        getJSON("/api/health")
      ]);
      const videos = Array.isArray(library.videos) ? library.videos : [];
      const storageVerified = health.storageVerified === true;
      const storageConfigured = health.storageConfigured === true || health.storageReady === true;
      const values = {
        "video-count": String(videos.length),
        "live-count": "0",
        "storage-state": storageVerified
          ? "Verified"
          : storageConfigured
            ? "Configured — unverified"
            : "Not configured",
        "storage-detail": storageVerified
          ? "ElasticLake live verification passed"
          : storageConfigured
            ? "Credentials are configured; live write/read/delete verification is still required"
            : "ElasticLake configuration is incomplete"
      };
      for (const [id, value] of Object.entries(values)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      }
      setSystemReady(storageVerified);
    } catch {
      const values = {
        "video-count": "—",
        "live-count": "0",
        "storage-state": "Offline",
        "storage-detail": "Backend status unavailable"
      };
      for (const [id, value] of Object.entries(values)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      }
      const status = document.getElementById("system-status");
      if (status) {
        status.classList.remove("ready");
        status.innerHTML = "<span></span> Backend unavailable";
      }
    }
    await loadWallet();
  }

  window.addEventListener("DOMContentLoaded", loadDashboard);
})();