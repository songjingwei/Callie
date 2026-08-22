/**
 * Toggle Light / Dark on .device preview frames only.
 * Persists choice in localStorage — does NOT affect hub page chrome.
 */
(function () {
  var STORAGE_KEY = "callie-device-theme";

  function getDevice() {
    return document.querySelector(".device");
  }

  function setActive(theme) {
    document.querySelectorAll("[data-theme-btn]").forEach(function (btn) {
      var isActive = btn.getAttribute("data-theme-btn") === theme;
      btn.classList.toggle("theme-toggle__btn--active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function applyTheme(theme) {
    var device = getDevice();
    if (!device) return;
    device.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    setActive(theme);

    var status = device.querySelector(".device__status");
    if (status) {
      status.classList.toggle("device__status--light", theme === "light");
      status.classList.toggle("device__status--dark", theme === "dark");
    }
  }

  function init() {
    var device = getDevice();
    if (!device) return;

    var saved = localStorage.getItem(STORAGE_KEY);
    var initial = saved || device.getAttribute("data-theme") || "light";
    applyTheme(initial);

    document.querySelectorAll("[data-theme-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyTheme(btn.getAttribute("data-theme-btn"));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
