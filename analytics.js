/* Search analytics shared by the full catalogue and new listings. */
(() => {
  "use strict";

  const MEASUREMENT_ID = "G-82MNWE7W34";
  const PREFERENCE_KEY = "re-collectibles-shop-analytics-v1";
  const DISABLE_KEY = "ga-disable-" + MEASUREMENT_ID;
  const trackers = [];
  // Local previews and copies of this shop must not pollute the live report.
  const isLiveShop = window.location.hostname === "re-collectibles.github.io" &&
    window.location.pathname.startsWith("/shop/");
  let preference = readPreference();
  let tagStarted = false;
  let tagFailed = false;

  window[DISABLE_KEY] = true;

  function readPreference() {
    try {
      // Start automatically, while preserving any explicit opt-out.
      return window.localStorage.getItem(PREFERENCE_KEY) === "deny" ? "deny" : "allow";
    } catch (_) {
      return "allow"; // Browsing and searching still work when storage is blocked.
    }
  }

  function gtag() {
    window.dataLayer.push(arguments);
  }

  function canTrack() {
    return isLiveShop && preference === "allow" && !tagFailed;
  }

  function startAnalytics() {
    if (!canTrack()) return;
    window[DISABLE_KEY] = false;
    if (tagStarted) {
      gtag("consent", "update", { analytics_storage: "granted" });
      return;
    }
    tagStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;
    gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Keep URL queries, fragments and referrers out of the search report.
      page_location: window.location.origin + window.location.pathname,
      page_referrer: "",
      cookie_domain: "re-collectibles.github.io",
      cookie_path: "/shop/"
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    script.onerror = () => {
      tagFailed = true;
      trackers.forEach(tracker => tracker.cancel());
    };
    document.head.appendChild(script);
  }

  function stopAnalytics() {
    window[DISABLE_KEY] = true;
    trackers.forEach(tracker => tracker.cancel());
    if (tagStarted) {
      // Remove search events queued while the Google library was loading.
      for (let i = window.dataLayer.length - 1; i >= 0; i--) {
        if (window.dataLayer[i][0] === "event") window.dataLayer.splice(i, 1);
      }
      gtag("consent", "update", { analytics_storage: "denied" });
    }
    // Remove the cookies created by this integration at its /shop/ path.
    for (const name of ["_ga", "_ga_" + MEASUREMENT_ID.slice(2)]) {
      document.cookie = name + "=; Max-Age=0; Path=/shop/; Domain=re-collectibles.github.io; SameSite=Lax; Secure";
    }
  }

  function setPreference(choice) {
    preference = choice;
    try {
      window.localStorage.setItem(PREFERENCE_KEY, choice);
    } catch (_) {
      // The choice remains effective for this page when it cannot be saved.
    }
    if (choice === "allow") startAnalytics();
    else stopAnalytics();
    renderPreference();
  }

  function renderPreference() {
    const status = document.getElementById("analytics-status");
    if (status) {
      status.textContent = preference === "allow"
        ? "Search analytics are enabled in this browser."
        : "Search analytics are disabled in this browser.";
    }
  }

  function createSearchTracker(section) {
    let timer = null;
    let pending = null;
    let lastSent = "";

    function cancel() {
      window.clearTimeout(timer);
      timer = null;
      pending = null;
      lastSent = "";
    }

    function flush() {
      window.clearTimeout(timer);
      timer = null;
      if (!pending || !canTrack()) return;
      const event = pending;
      pending = null;
      if (event.query === lastSent) return;
      lastSent = event.query;
      gtag("event", "search", {
        search_term: event.query,
        result_count: event.count,
        search_has_results: event.count > 0 ? "yes" : "no",
        search_section: section,
        send_to: MEASUREMENT_ID
      });
    }

    function schedule(query, count) {
      window.clearTimeout(timer);
      pending = null;
      query = String(query || "").trim().toLowerCase();
      if (!query) {
        cancel();
        return;
      }
      // Exclude obvious emails and URLs; keep numeric book/ISBN searches.
      if (!canTrack() || query.length < 2 || query.length > 100 ||
          /@|https?:\/\/|www\./i.test(query) ||
          !Number.isInteger(count) || count < 0) return;
      pending = { query, count };
      timer = window.setTimeout(flush, 1200);
    }

    const tracker = { schedule, flush, cancel };
    trackers.push(tracker);
    return tracker;
  }

  window.ShopAnalytics = { createSearchTracker };

  function init() {
    document.querySelectorAll("[data-analytics-choice]").forEach(button => {
      button.addEventListener("click", () => setPreference(button.dataset.analyticsChoice));
    });
    renderPreference();
    startAnalytics();
  }

  // Keep the choice in sync if it is changed in another shop tab.
  window.addEventListener("storage", event => {
    if (event.key !== PREFERENCE_KEY && event.key !== null) return;
    preference = readPreference();
    if (preference === "allow") startAnalytics();
    else stopAnalytics();
    renderPreference();
  });
  window.addEventListener("pagehide", () => trackers.forEach(tracker => tracker.cancel()));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
