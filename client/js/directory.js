/* Directory page: load businesses, search (keyup), category filter, details modal. */
$(function () {
  "use strict";

  var D = window.Doorstep;

  var $grid = $("#grid");
  var $status = $("#resultsStatus");
  var $search = $("#search");
  var $chips = $("#chips");
  var $wake = $("#wakeNotice");

  var state = {
    q: "",
    category: "",
    items: [],
    requestId: 0,
    timer: null,
    loadedOnce: false,
  };

  var modalEl = document.getElementById("bizModal");
  var modal = new bootstrap.Modal(modalEl);
  var lastOpener = null;

  /* ---------- Start from the URL (?q=...&category=...) ---------- */

  var params = new URLSearchParams(window.location.search);
  state.q = (params.get("q") || "").trim().slice(0, 100);
  if (D.CATEGORIES.indexOf(params.get("category")) > -1) state.category = params.get("category");
  $search.val(state.q);

  /* ---------- Category chips ---------- */

  function buildChips() {
    var html = '<button type="button" class="chip" data-category="" aria-pressed="false">All</button>';
    D.CATEGORIES.forEach(function (name) {
      html +=
        '<button type="button" class="chip" data-category="' + D.esc(name) + '" data-cat="' + D.esc(name) + '" aria-pressed="false">' +
        '<span class="dot" aria-hidden="true"></span>' + D.esc(name) + "</button>";
    });
    $chips.html(html);
    syncChips();
  }

  function syncChips() {
    $chips.find(".chip").each(function () {
      var active = $(this).attr("data-category") === state.category;
      $(this).attr("aria-pressed", active ? "true" : "false");
    });
  }

  /* ---------- Rendering ---------- */

  function cardHtml(b) {
    return (
      '<div class="col">' +
        '<article class="biz-card" data-cat="' + D.esc(b.category) + '">' +
          '<span class="monogram" aria-hidden="true">' + D.esc(D.initials(b.name)) + "</span>" +
          '<div class="biz-card-body">' +
            '<h2 class="biz-name">' + D.esc(b.name) + "</h2>" +
            '<p class="biz-meta">' +
              '<span class="cat-tag">' + D.esc(b.category) + "</span>" +
              '<span class="biz-city">' + D.PIN_ICON + D.esc(b.city) + "</span>" +
            "</p>" +
            '<p class="biz-tagline">' + D.esc(b.tagline) + "</p>" +
            '<button type="button" class="biz-open stretched-link" data-id="' + D.esc(b._id) + '">' +
              'View details<span class="visually-hidden"> for ' + D.esc(b.name) + "</span>" +
            "</button>" +
          "</div>" +
        "</article>" +
      "</div>"
    );
  }

  function showSkeleton() {
    var one =
      '<div class="col"><div class="biz-card skeleton placeholder-glow" aria-hidden="true">' +
      '<span class="monogram placeholder"></span>' +
      '<div class="biz-card-body flex-grow-1">' +
      '<span class="placeholder col-8 mb-2"></span>' +
      '<span class="placeholder col-5 mb-3"></span>' +
      '<span class="placeholder col-12"></span>' +
      "</div></div></div>";
    $grid.html(new Array(7).join(one));
    $status.text("Loading businesses...");
  }

  function statusText(count) {
    var text = count + (count === 1 ? " business" : " businesses");
    if (state.q) text += " matching \u201C" + state.q + "\u201D";
    if (state.category) text += " in " + state.category;
    return text;
  }

  function render() {
    $status.text(statusText(state.items.length));

    if (!state.items.length) {
      var filtered = state.q || state.category;
      $grid.html(
        '<div class="col-12"><div class="state-panel">' +
          "<h2>" + (filtered ? "No businesses match that search" : "Nothing listed yet") + "</h2>" +
          "<p>" + (filtered
            ? "Try a different word, pick another category, or clear the filters."
            : "Be the first to put a business on the map.") + "</p>" +
          (filtered ? '<button type="button" class="btn btn-ghost me-2" id="clearFilters">Clear filters</button>' : "") +
          '<a class="btn btn-sign" href="submit.html">Add Your Business</a>' +
        "</div></div>"
      );
      return;
    }

    $grid.html(state.items.map(cardHtml).join(""));
  }

  function renderError(err) {
    $status.text("");
    $grid.html(
      '<div class="col-12"><div class="state-panel" role="alert">' +
        "<h2>Couldn't load the directory</h2>" +
        "<p>" + D.esc(err.message) + "</p>" +
        '<button type="button" class="btn btn-sign" id="retryLoad">Try again</button>' +
      "</div></div>"
    );
  }

  /* ---------- Loading ---------- */

  function syncUrl() {
    var query = new URLSearchParams();
    if (state.q) query.set("q", state.q);
    if (state.category) query.set("category", state.category);
    var qs = query.toString();
    history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : ""));
  }

  function load() {
    var id = ++state.requestId; // ignore answers from older requests
    var query = {};
    if (state.q) query.q = state.q;
    if (state.category) query.category = state.category;

    $grid.attr("aria-busy", "true");
    if (!state.loadedOnce) showSkeleton();
    else $grid.addClass("is-loading");

    D.api.get("/api/businesses", query, {
      onSlow: function () {
        if (id === state.requestId) $wake.removeClass("d-none");
      },
    })
      .done(function (data) {
        if (id !== state.requestId) return;
        state.loadedOnce = true;
        state.items = Array.isArray(data) ? data : (data && data.businesses) || [];
        render();
      })
      .fail(function (err) {
        if (id !== state.requestId) return;
        renderError(err);
      })
      .always(function () {
        if (id !== state.requestId) return;
        $wake.addClass("d-none");
        $grid.removeClass("is-loading").attr("aria-busy", "false");
      });
  }

  /* ---------- Search (jQuery keyup) ---------- */

  $search.on("keyup search", function () {
    var value = $.trim($(this).val());
    if (value === state.q) return;
    state.q = value;
    clearTimeout(state.timer);
    state.timer = setTimeout(function () {
      syncUrl();
      load();
    }, 300); // wait for a pause in typing before asking the server
  });

  /* ---------- Category filter ---------- */

  $chips.on("click", ".chip", function () {
    state.category = $(this).attr("data-category");
    syncChips();
    syncUrl();
    load();
  });

  $grid.on("click", "#clearFilters", function () {
    state.q = "";
    state.category = "";
    $search.val("").trigger("focus");
    syncChips();
    syncUrl();
    load();
  });

  $grid.on("click", "#retryLoad", load);

  /* ---------- Details modal ---------- */

  function findById(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (String(state.items[i]._id) === id) return state.items[i];
    }
    return null;
  }

  function openModal(b) {
    var site = D.safeUrl(b.website);

    $(".modal-content", modalEl).attr("data-cat", b.category);
    $("#modalMono").text(D.initials(b.name));
    $("#bizModalTitle").text(b.name);
    $("#modalCat").text(b.category);
    $("#modalTagline").text(b.tagline);
    $("#modalOwner").text(b.owner || "Not shared");
    $("#modalCity").text(b.city);
    $("#modalListed").text(D.formatDate(b.createdAt) || "Recently");

    if (site) {
      $("#modalWebsite").html("").append($("<a>", { href: site, target: "_blank", rel: "noopener noreferrer", text: D.hostOf(site) }));
      $("#modalVisit").attr("href", site).removeClass("d-none");
    } else {
      $("#modalWebsite").text("Not shared");
      $("#modalVisit").addClass("d-none").removeAttr("href");
    }

    if (b.email) {
      $("#modalEmail").html("").append($("<a>", { href: "mailto:" + b.email, text: b.email }));
      $("#modalMail").attr("href", "mailto:" + b.email).removeClass("d-none");
    } else {
      $("#modalEmail").text("Not shared");
      $("#modalMail").addClass("d-none").removeAttr("href");
    }

    modal.show();
  }

  $grid.on("click", ".biz-open", function () {
    var business = findById($(this).attr("data-id"));
    if (!business) return;
    lastOpener = this;
    openModal(business);
  });

  $(modalEl).on("hidden.bs.modal", function () {
    if (lastOpener) $(lastOpener).trigger("focus");
  });

  /* ---------- Go ---------- */

  buildChips();
  load();
});
