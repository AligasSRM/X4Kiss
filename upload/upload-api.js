(() => {
  "use strict";

  const API_BASE = "https://xkiss.srourr-ali73.workers.dev";
  const SESSION_KEY = "x4keys_session_token";
  const LEGACY_SESSION_KEY = "xkiss_session_token";
  let sessionToken = window.sessionStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(LEGACY_SESSION_KEY) || "";
  if (sessionToken) window.sessionStorage.setItem(SESSION_KEY, sessionToken);
  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);

  async function request(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      ...options,
      headers: {
        "Accept": "application/json",
        ...(options.headers || {})
      }
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = { ok: false, message: "Invalid server response." };
    }

    if (!response.ok) {
      let message = data.message;
      if (!message && response.status === 401 && data.status === "invalid_credentials") {
        message = "Email or password was not accepted. Use the password for this account.";
      } else if (!message && response.status === 503 && data.status === "backend_not_configured") {
        message = "The authentication backend is not configured.";
      } else if (!message) {
        message = "X4Kiss request failed (HTTP " + response.status + ").";
      }
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async function getStorageStatus() {
    return request("/api/upload/status", { cache: "no-store" });
  }

  async function authenticate(email, password, createAccount = false) {
    const result = await request(createAccount ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!result.token) throw new Error("Authentication did not return a session token.");
    setSessionToken(result.token);
    return result;
  }

  async function verifySession() {
    if (!sessionToken) return { ok: false, status: "unauthenticated" };
    try {
      const result = await request("/api/auth/me", {
        method: "GET",
        headers: { "Authorization": "Bearer " + sessionToken },
        cache: "no-store"
      });
      if (result.ok === true && result.status === "authenticated") return result;
      setSessionToken("");
      return { ok: false, status: "unauthenticated" };
    } catch (error) {
      if (error.status === 401) setSessionToken("");
      throw error;
    }
  }

  async function prepareUpload(metadata) {
    if (!sessionToken) throw new Error("Sign in before uploading.");
    return request("/api/upload/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + sessionToken },
      body: JSON.stringify(metadata)
    });
  }

  async function uploadFile(file, metadata) {
    if (!sessionToken) throw new Error("Sign in before uploading.");
    return request("/api/upload", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + sessionToken,
        "Content-Type": file.type,
        "X-X4Kiss-File-Name": file.name,
        "X-X4Kiss-File-Size": String(file.size),
        "X-X4Kiss-Title": metadata.title,
        "X-X4Kiss-Description": metadata.description || "",
        "X-X4Kiss-Category": metadata.category
      },
      body: file
    });
  }

  function setSessionToken(token) {
    sessionToken = token || "";
    if (sessionToken) window.sessionStorage.setItem(SESSION_KEY, sessionToken);
    else window.sessionStorage.removeItem(SESSION_KEY);
  }

  window.XKissUploadAPI = { getStorageStatus, authenticate, verifySession, prepareUpload, uploadFile, setSessionToken };
})();