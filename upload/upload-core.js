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
    if (! $("video-title").value.trim()) return "Enter a video title.";
    if (!$("video-category").value) return "Select a category.";
    return "";
  }

  async function checkStorage() {
    try {
      const data = await window.XKissUploadAPI.getStorageStatus();
      setStorageStatus(Boolean(data.storageReady), data.storageReady ? "Storage ready" : "Storage not active");
      $("upload-status").textContent = data.storageReady
        ? "Object storage is reachable. Secure creator authorization and the actual file-transfer pipeline must also be enabled before upload."
        : "Production storage is not ready.";
      setProgress(0, data.storageReady ? "Storage check complete — no file uploaded" : "Waiting for storage");
    } catch {
      setStorageStatus(false, "Worker unavailable");
      $("upload-status").textContent = "Could not reach the XKiss upload service.";
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
      await window.XKissUploadAPI.prepareUpload(metadata);
      setProgress(25, "Creator session verified — transferring video");
      const data = await window.XKissUploadAPI.uploadFile(state.file, metadata);
      setProgress(100, "Video stored privately — not published");
      setResult((data.message || "Video stored privately.") + " Video key: " + (data.key || "stored"), "success");
      $("upload-status").textContent = "Upload complete to private storage. Public publishing and playback are not enabled.";
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

  async function authenticate(createAccount) {
    const status = $("creator-auth-status");
    const email = $("creator-email").value.trim();
    const password = $("creator-password").value;
    if (!email || !password) { status.textContent = "Enter your email and password."; return; }
    status.textContent = createAccount ? "Creating account…" : "Signing in…";
    try {
      const result = await window.XKissUploadAPI.authenticate(email, password, createAccount);
      if (createAccount) { status.textContent = result.message || "Account created. Sign in to continue."; return; }
      state.signedIn = true;
      status.textContent = "Signed in as " + (result.user?.email || email) + ". You can upload privately."; 
    } catch (error) { state.signedIn = false; status.textContent = error.message || "Account request failed."; }
  }

  function initialize() {
    $("video-file").addEventListener("change", handleFile);
    $("creator-login").addEventListener("click", () => authenticate(false));
    $("creator-register").addEventListener("click", () => { window.location.href = "register.html?next=creator-upload.html"; });
    $("prepare-upload").addEventListener("click", prepare);
    $("reset-upload").addEventListener("click", reset);
    checkStorage();
  }

  window.addEventListener("DOMContentLoaded", initialize);
})();