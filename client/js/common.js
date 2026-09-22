/* Shared by every page: dark mode, API helper, small utilities. */
(function (window, $) {
  "use strict";

  var CATEGORIES = ["Food", "Fashion", "Tech", "Health", "Education", "Services", "Retail", "Other"];

  var WAKE_MESSAGE =
    "The server is waking up. It sleeps when nobody is around, so the first request can take up to a minute.";

  /* ---------- Utilities ---------- */

  // Escape text before putting it into an HTML string.
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // "Thread & Needle Tailors" -> "TN"
  function initials(name) {
    var words = String(name || "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return "?";
    return (words[0].charAt(0) + (words[1] ? words[1].charAt(0) : "")).toUpperCase();
  }

  // Only allow http(s) links. Anything else (like javascript:) returns "".
  function safeUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (e) {
      return "";
    }
  }

  function hostOf(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch (e) {
      return value;
    }
  }

  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  var PIN_ICON =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 0a5 5 0 0 0-5 5c0 3.6 4.4 9.6 4.7 10a.4.4 0 0 0 .6 0C8.6 14.6 13 8.6 13 5a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>';

  /* ---------- Dark mode ----------
     The <head> of each page sets data-bs-theme before first paint, so there is
     no flash. This part wires up the toggle button and remembers the choice. */

  var THEME_KEY = "doorstep-theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
  }

  function syncToggle() {
    var dark = currentTheme() === "dark";
    $("#themeToggle")
      .attr("aria-pressed", dark ? "true" : "false")
      .attr("aria-label", dark ? "Switch to light mode" : "Switch to dark mode")
      .attr("title", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function applyTheme(theme, remember) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    if (remember) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage blocked: fine */ }
    }
    syncToggle();
  }

  /* ---------- API helper ---------- */

  // Opened from your own computer or home network (localhost, 192.168.x.x, ...)?
  // Then the API is the one you started with npm start, on port 5000 of the same machine.
  function isLocalHost(host) {
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
      /\.local$/.test(host)
    );
  }

  function apiBase() {
    var cfg = window.APP_CONFIG || {};
    var host = location.hostname;
    if (isLocalHost(host)) return "http://" + host + ":" + (cfg.LOCAL_API_PORT || 5000);
    return String(cfg.API_URL || "").replace(/\/+$/, "");
  }

  function friendlyError(xhr, status) {
    var body = xhr.responseJSON || {};
    var message;
    if (status === "timeout") {
      message = "The server took too long to answer. Try again in a moment.";
    } else if (xhr.status === 0) {
      message = "Couldn't reach the server. Check your connection and try again.";
    } else if (xhr.status === 429) {
      message = body.message || "Too many requests. Wait a little and try again.";
    } else if (xhr.status >= 500) {
      message = "The server ran into a problem. Try again in a moment.";
    } else {
      message = body.message || "Something went wrong. Try again.";
    }
    return { status: xhr.status, message: message, fields: body.fields || {} };
  }

  /* request(method, path, { params, json, onSlow })
     Returns a promise. onSlow runs if the server hasn't answered after 3.5s
     (Render's free tier sleeps, so the first request can be slow). */
  function request(method, path, options) {
    options = options || {};
    var base = apiBase();
    var deferred = $.Deferred();

    if (!base || /YOUR-API/i.test(base)) {
      return deferred
        .reject({
          status: 0,
          message: "The API address isn't set yet. Add your Render URL to client/js/config.js.",
          fields: {},
        })
        .promise();
    }

    var slowTimer = options.onSlow ? setTimeout(options.onSlow, 3500) : null;
    var ajax = { url: base + path, method: method, dataType: "json", timeout: 90000 };
    if (options.json) {
      ajax.data = JSON.stringify(options.json);
      ajax.contentType = "application/json";
    } else if (options.params) {
      ajax.data = options.params;
    }

    $.ajax(ajax)
      .done(function (data) { deferred.resolve(data); })
      .fail(function (xhr, status) { deferred.reject(friendlyError(xhr, status)); })
      .always(function () { clearTimeout(slowTimer); });

    return deferred.promise();
  }

  window.Doorstep = {
    CATEGORIES: CATEGORIES,
    WAKE_MESSAGE: WAKE_MESSAGE,
    PIN_ICON: PIN_ICON,
    esc: esc,
    initials: initials,
    safeUrl: safeUrl,
    hostOf: hostOf,
    formatDate: formatDate,
    api: {
      get: function (path, params, options) {
        return request("GET", path, $.extend({ params: params }, options));
      },
      post: function (path, json, options) {
        return request("POST", path, $.extend({ json: json }, options));
      },
    },
  };

  /* ---------- On every page ---------- */

  $(function () {
    syncToggle();

    $("#themeToggle").on("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });

    // Follow the system setting until the visitor picks a theme themselves.
    if (window.matchMedia) {
      var media = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function (e) {
        var saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (err) { /* ignore */ }
        if (!saved) applyTheme(e.matches ? "dark" : "light", false);
      };
      if (media.addEventListener) media.addEventListener("change", onChange);
    }

    $("#year").text(new Date().getFullYear());
  });
})(window, jQuery);
