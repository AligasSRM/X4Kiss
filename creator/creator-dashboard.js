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

  function setSystemReady(ready) {
    const pill = document.getElementById("system-status");
    const roadmap = document.getElementById("roadmap-storage");
    if (!pill || !roadmap) return;

    if (ready) {
      pill.classList.add("ready");
      pill.innerHTML = "<span></span> Storage connected";
      roadmap.textContent = "Connected";
    } else {
      pill.classList.remove("ready");
      pill.innerHTML = "<span></span> ElasticLake pending verification";
      roadmap.textContent = "Pending verification";
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
      if (ledger.storageReady) {
        const values = {
          "wallet-pending-detail": "Ledger connected",
          "wallet-available-detail": "Ledger connected",
          "payout-detail": "Eligibility layer ready",
          "roadmap-wallet": "Connected"
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
      const values = {
        "video-count": String(videos.length),
        "live-count": "0",
        "storage-state": health.storageReady ? "Ready" : "Pending",
        "storage-detail": health.storageReady
          ? "Production storage connected"
          : "ElasticLake credentials or verification pending"
      };
      for (const [id, value] of Object.entries(values)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      }
      setSystemReady(Boolean(health.storageReady));
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