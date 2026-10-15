(function () {
  "use strict";
  var SESSION_KEY = "x4keys_session_token";
  var token = "";
  try {
    token = sessionStorage.getItem(SESSION_KEY) || "";
  } catch (_) {}
  var file = (location.pathname.split("/").pop() || "index.html").split("?")[0];
  var target = file + location.search + location.hash;
  function sendToRegistration(reason) {
    var suffix = reason ? "&reason=" + encodeURIComponent(reason) : "";
    location.replace("register.html?next=" + encodeURIComponent(target) + suffix);
  }
  document.documentElement.style.visibility = "hidden";
  if (!token) { sendToRegistration("required"); return; }
  fetch("https://x4kiss.srourr-ali73.workers.dev/api/auth/me", {
    method: "GET",
    headers: { "Authorization": "Bearer " + token },
    cache: "no-store"
  }).then(function (response) {
    if (!response.ok) throw new Error("session_invalid");
    return response.json();
  }).then(function (data) {
    if (!data || data.ok !== true || data.status !== "authenticated") throw new Error("session_invalid");
    document.documentElement.style.visibility = "visible";
  }).catch(function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    sendToRegistration("session");
  });
})();