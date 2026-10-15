(() => {
  "use strict";

  const API_BASE = "https://xkiss.srourr-ali73.workers.dev";
  const SESSION_KEY = "x4keys_session_token";
  const LEGACY_SESSION_KEY = "xkiss_session_token";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showNotice(notice, message, isError = false) {
    if (!notice) return;
    notice.hidden = false;
    notice.textContent = message;
    notice.classList.toggle("error", isError);
  }

  async function loadLibrary() {
    const count = document.getElementById("library-count");
    const grid = document.getElementById("library-grid");
    const empty = document.getElementById("library-empty");
    const notice = document.getElementById("library-notice");
    if (!count || !grid || !empty) return;

    const token = window.sessionStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(LEGACY_SESSION_KEY) || "";
    if (token) window.sessionStorage.setItem(SESSION_KEY, token);
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
    if (!token) {
      count.textContent = "Sign-in required";
      grid.replaceChildren();
      empty.hidden = true;
      showNotice(notice, "Your creator session is missing. Sign in again to view your private videos.", true);
      return;
    }

    count.textContent = "Loading your library…";
    grid.replaceChildren();
    empty.hidden = true;

    try {
      const response = await fetch(API_BASE + "/api/creator/videos", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + token
        },
        cache: "no-store",
        credentials: "omit"
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an unreadable library response.");
      }

      if (response.status === 401) {
        window.sessionStorage.removeItem(SESSION_KEY);
        window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
        throw new Error("Your creator session has expired. Sign in again to access your private library.");
      }
      if (!response.ok || data.ok !== true) {
        throw new Error(data.message || "Your private library could not be loaded.");
      }

      const videos = Array.isArray(data.videos) ? data.videos : [];
      count.textContent = videos.length + " video" + (videos.length === 1 ? "" : "s");

      if (videos.length === 0) {
        empty.hidden = false;
        showNotice(notice, data.storageReady === true
          ? "Your private library is connected, but the server has not returned any videos for this account."
          : "No videos were returned. The server also reports that storage is not ready.", data.storageReady !== true);
        return;
      }

      const fragment = document.createDocumentFragment();
      for (const video of videos) {
        const article = document.createElement("article");
        article.className = "video-card";

        const thumb = document.createElement("div");
        thumb.className = "thumb";
        thumb.setAttribute("aria-hidden", "true");
        thumb.textContent = "X";

        const body = document.createElement("div");
        body.className = "video-body";

        const title = document.createElement("div");
        title.className = "video-title";
        title.textContent = String(video.title || "Untitled video");

        const meta = document.createElement("div");
        meta.className = "video-meta";
        meta.textContent = [
          video.fileName || video.key || "Video file",
          video.category || "Uncategorized",
          "Visibility: " + (video.visibility || "private"),
          "Download: " + (video.downloadPolicy || "disabled")
        ].join("\n");
        meta.style.whiteSpace = "pre-line";

        const badges = document.createElement("div");
        badges.className = "badges";

        const status = document.createElement("span");
        status.className = "badge" + (video.status === "stored" ? " ready" : "");
        status.textContent = "Status: " + String(video.status || "unknown");

        const storage = document.createElement("span");
        storage.className = "badge";
        storage.textContent = "Storage: " + String(video.storage || "not reported");

        badges.append(status, storage);
        body.append(title, meta, badges);
        article.append(thumb, body);
        fragment.append(article);
      }
      grid.replaceChildren(fragment);

      if (data.storageReady !== true) {
        showNotice(notice, "The server returned library metadata, but reports that storage is not currently ready. Verify the storage configuration before accepting new uploads.", true);
      } else {
        notice.hidden = true;
        notice.textContent = "";
        notice.classList.remove("error");
      }
    } catch (error) {
      count.textContent = "Library unavailable";
      grid.replaceChildren();
      empty.hidden = true;
      showNotice(notice, error instanceof Error ? error.message : "Your private library could not be loaded.", true);
    }
  }

  window.addEventListener("DOMContentLoaded", loadLibrary);
})();