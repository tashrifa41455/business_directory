/* Home page: count-up stats, "Just listed" board. */
$(function () {
  "use strict";

  var D = window.Doorstep;
  var $wake = $("#wakeNotice");
  var $statsError = $("#statsError");
  var pending = 0;

  function showWake() { $wake.removeClass("d-none"); }
  function requestDone() {
    pending -= 1;
    if (pending <= 0) $wake.addClass("d-none");
  }

  /* ----- Count-up ----- */

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function countUp($el, target) {
    if (reduceMotion || target === 0) {
      $el.text(target.toLocaleString());
      return;
    }
    var duration = 1200;
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3); // ease-out
      $el.text(Math.round(target * eased).toLocaleString());
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  // Start counting when the numbers scroll into view.
  function whenVisible(el, callback) {
    if (!("IntersectionObserver" in window)) return callback();
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        callback();
      }
    }, { threshold: 0.4 });
    observer.observe(el);
  }

  function loadStats() {
    $statsError.addClass("d-none");
    pending += 1;

    D.api.get("/api/businesses/stats", null, { onSlow: showWake })
      .done(function (stats) {
        var values = {
          total: Number(stats.total) || 0,
          cities: Number(stats.cities) || 0,
          categories: Number(stats.categories) || 0,
        };
        whenVisible(document.getElementById("ledger"), function () {
          $(".stat-num").each(function () {
            var key = $(this).attr("data-stat");
            countUp($(this), values[key] || 0);
          });
        });
      })
      .fail(function (err) {
        $(".stat-num").text("-");
        $statsError.removeClass("d-none").find(".error-text").text(err.message);
      })
      .always(requestDone);
  }

  /* ----- "Just listed" board ----- */

  function boardRow(b) {
    var q = encodeURIComponent(b.name || "");
    return (
      '<a class="board-row" href="directory.html?q=' + q + '" data-cat="' + D.esc(b.category) + '">' +
        '<span class="monogram" aria-hidden="true">' + D.esc(D.initials(b.name)) + "</span>" +
        "<span>" +
          '<p class="board-name">' + D.esc(b.name) + "</p>" +
          '<p class="board-sub">' + D.esc(b.category) + " in " + D.esc(b.city) + "</p>" +
        "</span>" +
      "</a>"
    );
  }

  function loadBoard() {
    var $rows = $("#boardRows");
    pending += 1;

    D.api.get("/api/businesses", null, { onSlow: showWake })
      .done(function (data) {
        var list = Array.isArray(data) ? data : (data && data.businesses) || [];
        if (!list.length) {
          $rows.html('<p class="board-empty mb-0">Nothing listed yet. Yours could be first.</p>');
          return;
        }
        $rows.html(list.slice(0, 3).map(boardRow).join(""));
      })
      .fail(function () {
        $rows.html('<p class="board-empty mb-0">The latest listings will show up here once the server answers.</p>');
      })
      .always(requestDone);
  }

  $("#retryStats").on("click", function () {
    loadStats();
  });

  loadStats();
  loadBoard();
});
