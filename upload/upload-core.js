(() => {
  "use strict";

  const state = { file: null, storageReady: false, signedIn: false };

  function $(id) { return document.getElementById(id); }

  function setResult(message, type = "") {
    const result = $("upload-result");
    result.hidden = false;
    result.className = "upload-result" + (type ? " " + type : "");
    result.textContent = message;
  }

  function setProgress(percent, label) {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    $("progress-bar").style.width = safePercent + "%";
    $("progress-value").textContent = Math.round(safePercent) + "%";
    $("progress-label").textContent = label;
  }

  function setStorageStatus(ready, message) {
    state.storageReady = ready;
    const pill = $("storage-status");
    pill.textContent = message;
    pill.className = "status-pill " + (ready ? "ready" : "error");
  }

  function validate() {
    if (!state.signedIn) return "Sign in with your creator account first.";
    if (!state.file) return "Select a video file first.";
    if (!state.file.type || !state.file.type.startsWith("video/")) return "The selected file is not a supported video.";
    if (state.file.size <= 0) return "The selected video file is empty.";
    if (state.file.size > 100 * 1024 * 1024) return "The upload limit is 100 MB per video.";
    const title = $("video-title");
    if (!title.value.trim()) {
      title.setAttribute("aria-invalid", "true");
      // Do not force programmatic focus on mobile: Android browsers may move
      // focus without opening the keyboard, making the field appear uneditable.
      title.scrollIntoView({ behavior: "smooth", block: "center" });
      return "Tap the Title field and type a name for this video, then tap Upload Video Privately again.";
    }
    title.removeAttribute("aria-invalid");
    if (!$("video-category").value) {
      const category = $("video-category");
      category.focus({ preventScroll: true });
      category.scrollIntoView({ behavior: "smooth", block: "center" });
      return "Select a category before uploading.";
    }
    return "";
  }

  async function checkStorage() {
    try {
      const data = await window.X4KissUploadAPI.getStorageStatus();
      setStorageStatus(Boolean(data.storageReady), data.storageReady ? "Storage ready" : "Storage not active");
      $("upload-status").textContent = data.storageReady
        ? "Object storage is reachable. Secure creator authorization and the actual file-transfer pipeline must also be enabled before upload."
        : "Production storage is not ready.";
      setProgress(0, data.storageReady ? "Storage check complete — no file uploaded" : "Waiting for storage");
    } catch {
      setStorageStatus(false, "Worker unavailable");
      $("upload-status").textContent = "Could not reach the X4Kiss upload service.";
      setProgress(0, "Upload service unavailable");
    }
  }

  function handleFile(event) {
    const file = event.target.files && event.target.files[0];
    state.file = file || null;
    $("file-name").textContent = file ? file.name + " — " + formatBytes(file.size) : "No file selected";
    $("upload-status").textContent = file
      ? "Video selected. Check metadata and server authorization readiness; selecting a file does not upload it."
      : "Choose a video file to begin.";
    $("upload-result").hidden = true;
    setProgress(0, file ? "Video selected — transfer not started" : "Upload not started");
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1) + " " + units[index];
  }

  async function prepare() {
    const validation = validate();
    if (validation) {
      setResult(validation, "error");
      setProgress(0, "Validation failed");
      return;
    }
    if (!state.storageReady) {
      setResult("Storage is not ready. No file was uploaded.", "error");
      setProgress(0, "Waiting for production storage");
      return;
    }

    const button = $("prepare-upload");
    button.disabled = true;
    button.textContent = "Checking…";
    setProgress(10, "Checking server-side upload readiness");

    try {
      const metadata = {
        fileName: state.file.name, fileSize: state.file.size, contentType: state.file.type,
        title: $("video-title").value.trim(), description: $("video-description").value.trim(),
        category: $("video-category").value
      };
      await window.X4KissUploadAPI.prepareUpload(metadata);
      setProgress(25, "Creator session verified — transferring video");
      const data = await window.X4KissUploadAPI.uploadFile(state.file, metadata);
      setProgress(100, "Video stored privately — not published");
      setResult((data.message || "Video stored privately.") + " Opening My Videos…", "success");
      $("upload-status").textContent = "Upload confirmed by the server. Opening your private video library.";
      window.location.assign("creator-library.html?uploaded=1");
    } catch (error) {
      setProgress(0, "Upload readiness check failed");
      setResult(error.message || "Upload readiness check failed. No file was uploaded.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Upload Video Privately";
    }
  }

  function reset() {
    state.file = null;
    $("video-file").value = "";
    $("file-name").textContent = "No file selected";
    $("video-title").value = "";
    $("video-description").value = "";
    $("video-category").value = "";
    $("download-policy").value = "disabled";
    $("video-visibility").value = "private";
    $("upload-status").textContent = "Choose a video file to begin.";
    $("upload-result").hidden = true;
    setProgress(0, "Upload not started");
  }

  async function restoreSession() {
    const status = $("creator-auth-status");
    try {
      const result = await window.X4KissUploadAPI.verifySession();
      state.signedIn = result.ok === true && result.status === "authenticated";
      if (status) status.textContent = state.signedIn
        ? "Creator session verified."
        : "Your session is missing. Return to Home and sign in.";
      if (!state.signedIn) {
        window.location.replace("register.html?next=" + encodeURIComponent("creator-upload.html") + "&reason=required");
      }
    } catch {
      state.signedIn = false;
      if (status) status.textContent = "Could not verify your session. Please return to Home and sign in again.";
      window.location.replace("register.html?next=" + encodeURIComponent("creator-upload.html") + "&reason=session");
    }
  }

  function initialize() {
    $("video-file").addEventListener("change", handleFile);
    const titleField = $("video-title");
    titleField.setAttribute("inputmode", "text");
    titleField.setAttribute("enterkeyhint", "done");
    titleField.addEventListener("pointerdown", () => {
      // Let the user's tap own focus so the mobile keyboard can open normally.
      titleField.removeAttribute("aria-invalid");
    });
    titleField.addEventListener("input", () => {
      if (titleField.value.trim()) titleField.removeAttribute("aria-invalid");
    });
    titleField.addEventListener("change", () => {
      if (titleField.value.trim()) titleField.removeAttribute("aria-invalid");
    });
    $("prepare-upload").addEventListener("click", prepare);
    $("reset-upload").addEventListener("click", reset);
    restoreSession();
    checkStorage();
  }

  window.addEventListener("DOMContentLoaded", initialize);
})();