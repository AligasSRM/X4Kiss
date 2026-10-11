(() => {
  "use strict";

  const API_BASE = "https://xkiss.srourr-ali73.workers.dev";
  let sessionToken = "";

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
      const error = new Error(data.message || "XKiss request failed.");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async function getStorageStatus() {
    return request("/api/upload/status");
  }

  async function authenticate(email, password, createAccount = false) {
    const result = await request(createAccount ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (createAccount) return result;
    if (!result.token) throw new Error("Sign-in did not return a session token.");
    sessionToken = result.token;
    return result;
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
        "X-XKiss-File-Name": file.name,
        "X-XKiss-Title": metadata.title,
        "X-XKiss-Description": metadata.description || "",
        "X-XKiss-Category": metadata.category
      },
      body: file
    });
  }

  window.XKissUploadAPI = { getStorageStatus, authenticate, prepareUpload, uploadFile };
})();