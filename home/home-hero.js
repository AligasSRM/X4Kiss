document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const HOME = window.X4KissHome;

  if (!HOME) {
    console.warn("X4Kiss Home Hero: Home Core not loaded.");
    return;
  }

  function getHero() {
    return (
      document.querySelector(".hero") ||
      document.querySelector(".hero-section") ||
      document.querySelector("#hero")
    );
  }

  function getFeaturedVideoId(hero) {
    if (!hero) return null;

    return (
      hero.dataset.videoId ||
      hero.dataset.featuredId ||
      hero.querySelector("[data-video-id]")?.dataset.videoId ||
      hero.querySelector("[data-featured-id]")?.dataset.featuredId ||
      null
    );
  }

  function getHeroTitle(hero) {
    if (!hero) return "X4Kiss Featured";

    return (
      hero.querySelector(".hero-title")?.textContent.trim() ||
      hero.querySelector("h1")?.textContent.trim() ||
      "X4Kiss Featured"
    );
  }

  function openFeaturedVideo(hero) {
    const videoId = getFeaturedVideoId(hero);

    if (!videoId) {
      console.info(
        "X4Kiss Home Hero: Featured video is not connected yet.",
        getHeroTitle(hero)
      );
      return;
    }

    if (
      window.X4KissHomeVideos &&
      typeof window.X4KissHomeVideos.openVideo === "function"
    ) {
      window.X4KissHomeVideos.openVideo(
        videoId,
        getHeroTitle(hero)
      );
      return;
    }

    window.location.href =
      `player.html?id=${encodeURIComponent(videoId)}`;
  }

  function bindHeroFeatured() {
    const hero = getHero();

    if (!hero) {
      console.info("X4Kiss Home Hero: Hero section not found.");
      return;
    }

    if (hero.dataset.homeHeroBound === "true") {
      return;
    }

    hero.dataset.homeHeroBound = "true";

    const featuredButtons = hero.querySelectorAll(
      ".featured-btn, .hero-watch-btn, .watch-featured, [data-hero-action='watch']"
    );

    featuredButtons.forEach(button => {
      if (button.dataset.homeHeroButtonBound === "true") {
        return;
      }

      button.dataset.homeHeroButtonBound = "true";

      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        openFeaturedVideo(hero);
      });
    });
  }

  function refreshHero() {
    bindHeroFeatured();
  }

  window.X4KissHomeHero = {
    getHero,
    getFeaturedVideoId,
    getHeroTitle,
    openFeaturedVideo,
    bindHeroFeatured,
    refreshHero
  };

  bindHeroFeatured();

  console.log("X4Kiss Home Hero loaded.");
});
