document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const HOME = window.X4KissHome;

  if (!HOME) {
    console.warn("X4Kiss Home Navigation: Home Core not loaded.");
    return;
  }

  function bindNavigationLinks() {
    const links = document.querySelectorAll(
      ".nav-links a, .quick-card"
    );

    links.forEach(link => {
      if (link.dataset.homeNavigationBound === "true") return;

      const href = link.getAttribute("href");

      if (!href || !href.startsWith("#")) return;

      const targetId = href.substring(1);

      if (!document.getElementById(targetId)) return;

      link.dataset.homeNavigationBound = "true";

      link.addEventListener("click", event => {
        event.preventDefault();
        HOME.scrollToSection(targetId);
      });
    });
  }

  function bindHeroButtons() {
    document.querySelectorAll(".hero-buttons .btn").forEach(button => {
      if (button.dataset.homeNavigationBound === "true") return;

      const text = button.textContent.trim().toLowerCase();

      let targetId = "";

      if (text.includes("explore videos")) {
        targetId = "videos";
      }

      if (text.includes("discover creators")) {
        targetId = "creators";
      }

      if (!targetId) return;

      button.dataset.homeNavigationBound = "true";

      button.addEventListener("click", event => {
        event.preventDefault();
        HOME.scrollToSection(targetId);
      });
    });
  }

  bindNavigationLinks();
  bindHeroButtons();

  window.X4KissHomeNavigation = {
    bindNavigationLinks,
    bindHeroButtons
  };

  console.log("X4Kiss Home Navigation loaded.");
});
