document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const player = document.getElementById("player");
  const video = document.getElementById("video");

  const videoTitle = document.getElementById("videoTitle");
  const videoDuration = document.getElementById("videoDuration");
  const creatorName = document.getElementById("creatorName");
  const videoTags = document.getElementById("videoTags");
  const views = document.getElementById("views");

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsMenu = document.getElementById("settingsMenu");
  const ccBtn = document.getElementById("ccBtn");
  const resetSpeedBtn = document.getElementById("resetSpeedBtn");

  if (!player || !video) {
    console.error("X4Kiss: Player elements not found.");
    return;
  }

  /*
   * X4Kiss Module Lifecycle Control — 15.24
   * Player Core remains the single lifecycle authority.
   */
  import("../player/runtime/xkiss-module-lifecycle-integration.js")
    .then(({ installX4KissModuleLifecycle }) => {
      const result = installX4KissModuleLifecycle(window.X4KissPlayerCore);
      if (!result.ok) {
        console.error("X4Kiss: Module lifecycle installation failed:", result.error);
        return;
      }
      console.log("X4Kiss Module Lifecycle 15.24 ready.");
    })
    .catch(error => {
      console.error("X4Kiss: Module lifecycle load failed:", error);
    });

  /*
   * X4Kiss Module Contract Registry — 15.25
   * Player Core remains the single contract authority.
   */
  import("../player/runtime/xkiss-module-contract-integration.js")
    .then(({ installX4KissModuleContractRegistry }) => {
      const result = installX4KissModuleContractRegistry(window.X4KissPlayerCore);
      if (!result.ok) {
        console.error("X4Kiss: Module contract registry installation failed:", result.error);
        return;
      }
      console.log("X4Kiss Module Contract Registry 15.25 ready.");
    })
    .catch(error => {
      console.error("X4Kiss: Module contract registry load failed:", error);
    });

  /*
   * X4Kiss Module Dependency Orchestration — 15.26
   * Player Core remains the single orchestration authority.
   */
  Promise.all([
    import("../player/runtime/xkiss-module-lifecycle-integration.js"),
    import("../player/runtime/xkiss-module-contract-integration.js"),
    import("../player/runtime/xkiss-module-orchestration-integration.js"),
    import("../player/runtime/xkiss-module-security-integration.js"),
    import("../player/runtime/xkiss-module-health-integration.js"),
    import("../player/runtime/xkiss-module-diagnostics-integration.js"),
    import("../player/runtime/xkiss-module-recovery-integration.js"),
    import("../player/runtime/xkiss-module-recovery-guard-integration.js")
  ])
    .then(([lifecycleModule, contractModule, orchestrationModule, securityModule, healthModule, diagnosticsModule, recoveryModule, recoveryGuardModule]) => {
      const lifecycle = lifecycleModule.installX4KissModuleLifecycle(window.X4KissPlayerCore);
      const contracts = contractModule.installX4KissModuleContractRegistry(window.X4KissPlayerCore);
      if (!lifecycle.ok || !contracts.ok) {
        console.error("X4Kiss: Module orchestration prerequisites failed.");
        return;
      }

      const orchestration = orchestrationModule.installX4KissModuleOrchestrator(window.X4KissPlayerCore);
      if (!orchestration.ok) {
        console.error("X4Kiss: Module orchestration installation failed:", orchestration.error);
        return;
      }

      const security = securityModule.installX4KissModuleSecurity(window.X4KissPlayerCore);
      if (!security.ok) {
        console.error("X4Kiss: Security installation failed:", security.error);
        return;
      }

      console.log("X4Kiss Module Dependency Orchestration 15.26 ready.");
      console.log("X4Kiss Security & Attack Protection 15.27 ready.");

      const health = healthModule.installX4KissModuleHealth(window.X4KissPlayerCore);
      if (!health.ok) {
        console.error("X4Kiss: Module Health installation failed:", health.error);
        return;
      }
      console.log("X4Kiss Module Health & Fault Detection 15.28 ready.");

      const diagnostics = diagnosticsModule.installX4KissModuleDiagnostics(window.X4KissPlayerCore);
      if (!diagnostics.ok) {
        console.error("X4Kiss: Module Diagnostics installation failed:", diagnostics.error);
        return;
      }
      console.log("X4Kiss Module Diagnostics & Fault Locator 15.29 ready.");

      const recovery = recoveryModule.installX4KissModuleRecovery(window.X4KissPlayerCore);
      if (!recovery.ok) {
        console.error("X4Kiss: Module Recovery installation failed:", recovery.error);
        return;
      }
      console.log("X4Kiss Module Self-Healing & Auto-Recovery 15.30 ready.");

      const recoveryGuard = recoveryGuardModule.installX4KissModuleRecoveryGuard(window.X4KissPlayerCore);
      if (!recoveryGuard.ok) {
        console.error("X4Kiss: Recovery Guard installation failed:", recoveryGuard.error);
        return;
      }
      console.log("X4Kiss Recovery Guard & Anti-Loop Protection 15.31 ready.");
    })
    .catch(error => {
      console.error("X4Kiss: Runtime security/orchestration load failed:", error);
    });

  /*
   * Video ID
   */

  const params = new URLSearchParams(location.search);
  const requestedId = params.get("id") || "video-001";

  /*
   * Video data
   */

  let videoData = null;

  if (typeof getX4KissVideo === "function") {
    videoData =
      getX4KissVideo(requestedId) ||
      getX4KissVideo("video-001");
  } else if (typeof XKISS_VIDEOS !== "undefined") {
    videoData =
      XKISS_VIDEOS[requestedId] ||
      XKISS_VIDEOS["video-001"];
  }

  if (!videoData) {
    if (videoTitle) {
      videoTitle.textContent = "Video Not Found";
    }

    console.error(
      "X4Kiss: Video data not found:",
      requestedId
    );

    return;
  }

  /*
   * Basic video information
   */

  if (videoTitle) {
    videoTitle.textContent =
      videoData.title || "X4Kiss Video";
  }

  if (videoDuration) {
    videoDuration.textContent =
      videoData.duration || "00:00";
  }

  if (creatorName) {
    creatorName.textContent =
      videoData.creator || "X4Kiss Creator";
  }

  /*
   * Views
   */

  if (views) {
    const count =
      Number.isFinite(
        Number(videoData.statistics?.views)
      )
        ? Number(videoData.statistics.views)
        : Number(videoData.views || 0);

    views.textContent = count;
  }

  /*
   * Tags
   */

  if (videoTags) {
    videoTags.innerHTML = "";

    if (Array.isArray(videoData.tags)) {
      videoData.tags.forEach(tag => {
        const element = document.createElement("span");
        const text = String(tag);

        element.textContent =
          text.startsWith("#")
            ? text
            : "#" + text;

        videoTags.appendChild(element);
      });
    }
  }

  /*
   * Settings
   */

  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener("click", e => {
      e.stopPropagation();

      settingsMenu.classList.toggle("show");

      document
        .getElementById("qualityMenu")
        ?.classList.remove("show");

      document
        .getElementById("speedMenu")
        ?.classList.remove("show");
    });
  }

  /*
   * Captions
   */

  ccBtn?.addEventListener("click", () => {
    if (videoData.captions?.available) {
      alert(
        "Caption tracks are available for integration."
      );
    } else {
      alert(
        "CC is ready for future subtitle integration."
      );
    }
  });

  /*
   * Reset playback speed
   */

  resetSpeedBtn?.addEventListener("click", () => {
    video.playbackRate = 1;

    const speedBtn =
      document.getElementById("speedBtn");

    if (speedBtn) {
      speedBtn.textContent = "1x";
    }

    settingsMenu?.classList.remove("show");
  });

  /*
   * Close menus
   */

  document.addEventListener("click", () => {
    document
      .getElementById("qualityMenu")
      ?.classList.remove("show");

    document
      .getElementById("speedMenu")
      ?.classList.remove("show");

    settingsMenu?.classList.remove("show");
  });

  [
    document.getElementById("qualityMenu"),
    document.getElementById("speedMenu"),
    settingsMenu
  ].forEach(menu => {
    menu?.addEventListener("click", e => {
      e.stopPropagation();
    });
  });

  /*
   * Views & Revenue — view event
   *
   * A view event is sent only after playback has genuinely started.
   * The Worker validates the event. It is not counted or persisted yet.
   */
  let viewEventSent = false;

  async function sendViewEventOnce() {
    if (viewEventSent || !window.X4KissViews) {
      return;
    }

    viewEventSent = true;

    try {
      const event = window.X4KissViews.createViewEvent(videoData.id, videoData.creatorId);
      const result = await window.X4KissViews.validateViewEvent(event);

      console.log("X4Kiss View Event:", result);
    } catch (error) {
      viewEventSent = false;
      console.error("X4Kiss: View event failed:", error);
    }
  }

  video.addEventListener("error", () => {
    console.error("X4Kiss: Video runtime error:", {
      code: video.error?.code || null,
      message: video.error?.message || "",
      currentSrc: video.currentSrc || ""
    });
  });

  video.addEventListener("playing", sendViewEventOnce);

  /*
   * Public player state
   */

  window.X4KissPlayer = {
    id: videoData.id,
    data: videoData,
    video,
    elements: {
      player,
      video
    }
  };

  window.dispatchEvent(new CustomEvent("xkiss:player-ready"));

  console.log(
    "X4Kiss Player loaded:",
    videoData.id,
    videoData.title
  );
});
