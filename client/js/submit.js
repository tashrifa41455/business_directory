/* Submit page: jQuery validation, POST to the API, success message. */
$(function () {
  "use strict";

  var D = window.Doorstep;

  var $form = $("#bizForm");
  var $alert = $("#formAlert");
  var $submit = $("#submitBtn");
  var $wake = $("#wakeNotice");
  var $success = $("#successPanel");
  var fieldNames = ["name", "owner", "category", "city", "tagline", "website", "email"];

  /* ---------- Rules (same limits as the server) ---------- */

  function required(value, message) { return value ? "" : message; }

  function textRule(label, min, max, requiredMessage) {
    return function (value) {
      if (!value) return requiredMessage;
      if (value.length < min) return "The " + label + " needs at least " + min + " characters.";
      if (value.length > max) return "Keep the " + label + " under " + max + " characters.";
      return "";
    };
  }

  // "example.com" is fine: we add https:// for the visitor.
  function normaliseWebsite(value) {
    if (!value) return "";
    return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : "https://" + value;
  }

  var rules = {
    name: textRule("business name", 2, 80, "Enter the business name."),
    owner: textRule("owner's name", 2, 60, "Enter the owner's name."),
    category: function (value) {
      if (!value) return "Choose a category.";
      return D.CATEGORIES.indexOf(value) > -1 ? "" : "Choose a category from the list.";
    },
    city: textRule("city", 2, 60, "Enter the city."),
    tagline: textRule("tagline", 5, 120, "Add a short tagline."),
    website: function (value) {
      if (!value) return ""; // optional
      var address = normaliseWebsite(value);
      if (!D.safeUrl(address)) return "Enter a valid web address, like https://example.com.";
      try {
        return new URL(address).hostname.indexOf(".") > -1 ? "" : "Enter a valid web address, like https://example.com.";
      } catch (e) {
        return "Enter a valid web address, like https://example.com.";
      }
    },
    email: function (value) {
      if (!value) return "Enter an email address.";
      if (value.length > 120) return "Keep the email under 120 characters.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Enter a valid email address.";
    },
  };

  /* ---------- Showing errors under inputs ---------- */

  function valueOf(name) { return $.trim($("#" + name).val()); }

  function setError(name, message) {
    var $input = $("#" + name);
    var $error = $("#" + name + "-error");
    if (message) {
      $input.addClass("is-invalid").attr("aria-invalid", "true");
      $error.text(message);
    } else {
      $input.removeClass("is-invalid").removeAttr("aria-invalid");
      $error.text("");
    }
  }

  function validateField(name) {
    var message = rules[name](valueOf(name));
    setError(name, message);
    return !message;
  }

  function validateAll() {
    var firstBad = null;
    fieldNames.forEach(function (name) {
      if (!validateField(name) && !firstBad) firstBad = name;
    });
    return firstBad;
  }

  // Validate a field when the visitor leaves it, then keep it fresh as they fix it.
  $form.on("blur change", "input, select", function () {
    if (this.id && rules[this.id]) validateField(this.id);
  });
  $form.on("input", "input", function () {
    if (this.id && rules[this.id] && $(this).hasClass("is-invalid")) validateField(this.id);
  });

  $("#tagline").on("input", function () {
    $("#taglineCount").text(this.value.length + " / 120");
  });

  /* ---------- Alert + loading state ---------- */

  function showAlert(message) {
    $alert.text(message).removeClass("d-none");
  }

  function setBusy(busy) {
    $submit.prop("disabled", busy);
    $submit.find(".spinner-border").toggleClass("d-none", !busy);
    $submit.find(".btn-label").text(busy ? "Adding your business..." : "Add my business");
    $form.attr("aria-busy", busy ? "true" : "false");
    if (!busy) $wake.addClass("d-none");
  }

  /* ---------- Submit ---------- */

  $form.on("submit", function (event) {
    event.preventDefault();
    $alert.addClass("d-none");

    var firstBad = validateAll();
    if (firstBad) {
      var el = document.getElementById(firstBad);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.focus({ preventScroll: true });
      return;
    }

    var payload = {};
    fieldNames.forEach(function (name) { payload[name] = valueOf(name); });
    payload.website = normaliseWebsite(payload.website);

    setBusy(true);

    D.api.post("/api/businesses", payload, {
      onSlow: function () { $wake.removeClass("d-none"); },
    })
      .done(function (saved) {
        $("#successName").text((saved && saved.name) || payload.name);
        $("#successLink").attr("href", "directory.html?q=" + encodeURIComponent((saved && saved.name) || payload.name));
        $form.closest("#formWrap").addClass("d-none");
        $success.removeClass("d-none").trigger("focus");
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .fail(function (err) {
        // The API answers 400 with { fields: { name: "message", ... } }.
        var shown = 0;
        var firstField = null;
        $.each(err.fields || {}, function (name, message) {
          if ($.inArray(name, fieldNames) > -1) {
            setError(name, message);
            shown += 1;
            if (!firstField) firstField = name;
          }
        });
        if (firstField) {
          document.getElementById(firstField).focus();
        } else {
          showAlert(err.message);
        }
        if (!shown && !err.message) showAlert("Something went wrong. Try again.");
      })
      .always(function () { setBusy(false); });
  });

  /* ---------- "Add another" ---------- */

  $("#addAnother").on("click", function () {
    $form[0].reset();
    fieldNames.forEach(function (name) { setError(name, ""); });
    $("#taglineCount").text("0 / 120");
    $success.addClass("d-none");
    $("#formWrap").removeClass("d-none");
    $("#name").trigger("focus");
  });
});
