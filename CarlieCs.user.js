// ==UserScript==
// @name         Carlie C's Clip All Coupons
// @namespace    https://www.carliecs.com/
// @version      2026-08-14
// @description  Click all visible Clip buttons on Carlie C's digital coupons pages and related AppCard frames
// @author       Evan Ross (evan@eross.com)
// @match        https://www.carliecs.com/*
// @match        https://*.appcard.com/*
// @match        https://appcard.com/*
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

  function getClickableClipElements() {
    const selectors = [
      "button",
      "[role='button']",
      "a",
      "input[type='button']",
      "input[type='submit']",
    ];
    const clipTexts = ["clip", "clip coupon", "load to card", "add"];

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

      return clipTexts.includes(text);
    });
  }

  // The clip widgets (including the AppCard iframe) can render well after
  // the page's load event, so wait for actual content instead of guessing a
  // fixed delay.
  // ai: claude-sonnet-5 | 2026-07-31
  function waitForClipElements(timeoutMs) {
    return new Promise((resolve) => {
      if (getClickableClipElements().length > 0) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (getClickableClipElements().length > 0) {
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

  async function clickAllClipButtons() {
    const clicked = new WeakSet();
    let totalClicked = 0;

    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
      let clickedThisPass = 0;
      const clipElements = getClickableClipElements();

      for (const element of clipElements) {
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
        await waitForClipElements(SETTLE_WAIT_TIMEOUT_MS);
        if (getClickableClipElements().length > 0) {
          continue;
        }

        console.log(`Carlie C's clip-all finished. Clicked ${totalClicked} coupon buttons.`);
        alert(`Finished. Clicked ${totalClicked} coupon buttons.`);
        return;
      }

      await sleep(PASS_DELAY_MS);
    }

    console.log(`Carlie C's clip-all stopped after ${MAX_PASSES} passes.`);
    alert(`Stopped after ${MAX_PASSES} passes.`);
  }

  async function run() {
    await waitForClipElements(INITIAL_WAIT_TIMEOUT_MS);
    await clickAllClipButtons();
  }

  const CARLIECS_PATH_RE = /^\/(digital-coupons|fam-rewards)/;
  let running = false;

  // The AppCard iframe pages have their own broad @match and aren't a
  // client-routed part of carliecs.com, so they're always a valid target;
  // carliecs.com itself is only a target on the two coupon-related paths.
  function isTargetPage() {
    if (location.hostname === "appcard.com" || location.hostname.endsWith(".appcard.com")) {
      return true;
    }
    return CARLIECS_PATH_RE.test(location.pathname);
  }

  function start() {
    if (running || !isTargetPage()) {
      return;
    }
    running = true;
    run()
      .catch((error) => {
        console.error("Carlie C's clip-all script failed:", error);
        alert(`Script failed: ${error.message}`);
      })
      .finally(() => {
        running = false;
      });
  }

  // @match now covers all of carliecs.com (not just the two coupon paths) so
  // this script is present from the moment you land on the homepage. Like
  // Food Lion, Carlie C's is a client-routed site: navigating to Digital
  // Coupons or Fam Rewards updates the URL via history.pushState instead of a
  // real navigation, which never fires a fresh "load" event and never
  // triggers Tampermonkey's own document-match re-injection (that only
  // happens on an actual navigation to a matching URL). Hooking
  // pushState/replaceState/popstate lets the script notice the SPA route
  // change itself and start once the path becomes a target page.
  // ai: claude-sonnet-5 | 2026-08-14
  function watchForTargetRoute() {
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

  // On a real page load, "load" hasn't fired yet when this attaches, so the
  // listener catches it. But when navigating here via the site's own SPA
  // routing, Tampermonkey re-injects the script for the new URL after "load"
  // has already fired, so the event is missed unless we check readyState here.
  // ai: claude-sonnet-5 | 2026-08-12
  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start);
  }
  watchForTargetRoute();
})();
