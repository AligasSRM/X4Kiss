/*
X4KISS FILE CERTIFICATE
Status: YELLOW — source cleanup applied; runtime tests pending
Scope: legacy demo video catalog / X4Kiss data identifier
Completed: removed unverified sample-video data and the obsolete Cloudflare Stream provider label; aligned the data identifier with X4Kiss.
Verification: static source review only. Browser rendering, player playback, search, and full test suite have not been run.
Next phase: BLUE — run targeted tests and browser checks with real catalog data before enabling playback.
Lock: not locked until targeted verification passes.
*/
(() => {
  "use strict";

  const state = {
    allVideos: [],
    filteredVideos: [],
    category: "All",
    search: "",
    sort: "latest"
  };

  function getVideos() {
    if (
      typeof X4KISS_VIDEOS !== "object" ||
      X4KISS_VIDEOS === null
    ) {
      console.error("X4Kiss Videos: X4KISS_VIDEOS data is unavailable.");
      return [];
    }

    return Object.values(X4KISS_VIDEOS).filter(
      video => video && video.id
    );
  }

  function setState(patch = {}) {
    Object.assign(state, patch);
  }

  function getState() {
    return {
      ...state,
      allVideos: [...state.allVideos],
      filteredVideos: [...state.filteredVideos]
    };
  }

  function getCategories() {
    const categories = new Set(["All"]);

    state.allVideos.forEach(video => {
      if (video.category) {
        categories.add(video.category);
      }

      (video.tags || []).forEach(tag => {
        if (tag) {
          categories.add(tag);
        }
      });
    });

    return [...categories];
  }

  function applyFilters() {
    let videos = [...state.allVideos];
    const search = state.search.trim().toLowerCase();

    if (state.category !== "All") {
      videos = videos.filter(video => {
        const category = String(
          video.category || ""
        ).toLowerCase();

        const tags = (video.tags || []).map(tag =>
          String(tag).toLowerCase()
        );

        return (
          category === state.category.toLowerCase() ||
          tags.includes(state.category.toLowerCase())
        );
      });
    }

    if (search) {
      videos = videos.filter(video => {
        const haystack = [
          video.title,
          video.creator,
          video.category,
          ...(video.tags || [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });
    }

    videos.sort((a, b) => {
      if (state.sort === "title") {
        return String(a.title || "").localeCompare(
          String(b.title || "")
        );
      }

      if (state.sort === "creator") {
        return String(a.creator || "").localeCompare(
          String(b.creator || "")
        );
      }

      const aDate = a.publishedAt
        ? new Date(a.publishedAt).getTime()
        : 0;

      const bDate = b.publishedAt
        ? new Date(b.publishedAt).getTime()
        : 0;

      return (
        bDate - aDate ||
        String(a.id).localeCompare(String(b.id))
      );
    });

    state.filteredVideos = videos;

    return getState();
  }

  function initialize() {
    state.allVideos = getVideos();
    applyFilters();

    window.XKissVideos = {
      getState,
      getCategories,
      setState,
      applyFilters
    };

    document.dispatchEvent(
      new CustomEvent("xkiss:videos-ready")
    );
  }

  window.addEventListener(
    "DOMContentLoaded",
    initialize
  );
})();