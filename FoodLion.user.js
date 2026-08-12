// ==UserScript==
// @name         Food Lion Clip All Coupons
// @namespace    https://www.foodlion.com/
// @version      2026-08-12.1
// @description  Click all visible coupon buttons on Food Lion digital coupons pages
// @author       Evan Ross (evan@eross.com)
// @match        https://foodlion.com/*
// @match        https://www.foodlion.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const CLICK_DELAY_MS = 300;
  const PASS_DELAY_MS = 1200;
  const MAX_PASSES = 50;
  const INITIAL_WAIT_TIMEOUT_MS = 15000;
  const SETTLE_WAIT_TIMEOUT_MS = 4000;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isVisible(element) {
    if (!element) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function getCouponButtons() {
    const selectors = [
      "button",
      "[role='button']",
      "a",
      "input[type='button']",
      "input[type='submit']",
    ];
    const buttonTexts = [
      "clip",
      "clip!",
      "clip coupon",
      "load to card",
      "load to mvp",
      "load coupon",
      "add",
      "save",
    ];

    return Array.from(document.querySelectorAll(selectors.join(","))).filter((element) => {
      if (!isVisible(element) || element.disabled) {
        return false;
      }

      const text = (
        element.innerText ||
        element.textContent ||
        element.getAttribute("aria-label") ||
        element.getAttribute("value") ||
        ""
      )
        .trim()
        .toLowerCase();

      if (!text) {
        return false;
      }

      return buttonTexts.includes(text);
    });
  }

  // The coupon grid can render well after the page's load event, so wait for
  // actual content instead of guessing a fixed delay.
  // ai: claude-sonnet-5 | 2026-07-31
  function waitForCoupons(timeoutMs) {
    return new Promise((resolve) => {
      if (getCouponButtons().length > 0) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (getCouponButtons().length > 0) {
          observer.disconnect();
          clearTimeout(timer);
          resolve();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeoutMs);
    });
  }

  async function clickAllCouponButtons() {
    const clicked = new WeakSet();
    let totalClicked = 0;

    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
      let clickedThisPass = 0;
      const couponButtons = getCouponButtons();

      for (const element of couponButtons) {
        if (clicked.has(element)) {
          continue;
        }

        element.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(250);
        element.click();
        clicked.add(element);
        totalClicked += 1;
        clickedThisPass += 1;
        await sleep(CLICK_DELAY_MS);
      }

      if (clickedThisPass === 0) {
        await waitForCoupons(SETTLE_WAIT_TIMEOUT_MS);
        if (getCouponButtons().length > 0) {
          continue;
        }

        console.log(`Food Lion clip-all finished. Clicked ${totalClicked} coupon buttons.`);
        alert(`Finished. Clicked ${totalClicked} coupon buttons.`);
        return;
      }

      await sleep(PASS_DELAY_MS);
    }

    console.log(`Food Lion clip-all stopped after ${MAX_PASSES} passes.`);
    alert(`Stopped after ${MAX_PASSES} passes.`);
  }

  async function run() {
    await waitForCoupons(INITIAL_WAIT_TIMEOUT_MS);
    await clickAllCouponButtons();
  }

  const COUPONS_PATH_RE = /^\/savings\/coupons\/browse/;
  let running = false;

  function isCouponsPage() {
    return COUPONS_PATH_RE.test(location.pathname);
  }

  function start() {
    if (running || !isCouponsPage()) {
      return;
    }
    running = true;
    run()
      .catch((error) => {
        console.error("Food Lion clip-all script failed:", error);
        alert(`Script failed: ${error.message}`);
      })
      .finally(() => {
        running = false;
      });
  }

  // @match now covers the whole site (not just the coupons path) so this
  // script is present from the moment you land on the homepage. Food Lion is
  // a client-routed SPA: clicking Coupons from the hamburger menu updates the
  // URL via history.pushState instead of a real navigation, which never fires
  // a fresh "load" event and never triggers Tampermonkey's own document-match
  // re-injection (that only happens on an actual navigation to a matching
  // URL). Hooking pushState/replaceState/popstate lets the script notice the
  // SPA route change itself and start once the path becomes the coupons page.
  // ai: claude-sonnet-5 | 2026-08-12
  function watchForCouponsRoute() {
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      start();
      return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      start();
      return result;
    };

    window.addEventListener("popstate", start);
  }

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start);
  }
  watchForCouponsRoute();
})();
