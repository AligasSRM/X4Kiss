(() => {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  async function loadLibrary() {
    const count = document.getElementById("library-count");
    const grid = document.getElementById("library-grid");
    const empty = document.getElementById("library-empty");
    const notice = document.getElementById("library-notice");
    const token = window.sessionStorage.getItem("xkiss_session_token") || "";
    if (new URLSearchParams(window.location.search).get("uploaded") === "1") {
      notice.hidden = false;
      notice.textContent = "Upload confirmed. Your video is saved privately below; it is not public or playable until publishing and playback are enabled.";
    }

    try {
      const response = await fetch("https://xkiss.srourr-ali73.workers.dev/api/creator/videos", {
        headers: {"Accept":"application/json", "Authorization":"Bearer " + token},
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Library request failed.");

      if (data.ok !== true) throw new Error(data.message || "Library request failed.");
      const videos = Array.isArray(data.videos) ? data.videos : [];
      count.textContent = videos.length + " video" + (videos.length === 1 ? "" : "s");

      if (!videos.length) {
        grid.innerHTML = "";
        empty.hidden = false;
        return;
      }

      empty.hidden = true;
      grid.innerHTML = videos.map(video => (
        '<article class="video-card">' +
          '<div class="thumb">X</div>' +
          '<div class="video-body">' +
            '<div class="video-title">' + escapeHtml(video.title) + '</div>' +
            '<div class="video-meta">' +
              escapeHtml(video.fileName || video.key || "Video file") + '<br>' +
              escapeHtml(video.category || "Uncategorized") + '<br>' +
              escapeHtml(video.visibility || "private") + ' · ' +
              escapeHtml(video.downloadPolicy || "disabled") +
            '</div>' +
            '<div class="badges">' +
              '<span class="badge ready">' + escapeHtml(video.status || "Ready") + '</span>' +
              '<span class="badge">' + escapeHtml(video.storage || "Storage pending") + '</span>' +
            '</div>' +
          '</div>' +
        '</article>'
      )).join("");
    } catch (error) {
      count.textContent = "Library unavailable";
      grid.innerHTML = "";
      empty.hidden = true;
      if (notice) {
        notice.hidden = false;
        notice.textContent = error.message || "Your private library could not be loaded. Check your sign-in session and try again.";
        notice.classList.add("error");
      }
    }
  }

  window.addEventListener("DOMContentLoaded", loadLibrary);
})();
