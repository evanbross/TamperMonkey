// ==UserScript==
// @name         Wegmans Clip All Coupons
// @namespace    https://www.wegmans.com/shop/coupons
// @version      2026-08-12
// @description  Scroll to load all Wegmans coupons and click every Clip button
// @author       Evan Ross (evan@eross.com)
// @match        https://www.wegmans.com/shop/coupons*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const CLICK_DELAY_MS = 250;
  const PASS_DELAY_MS = 1000;
  const MAX_PASSES = 50;
  const INITIAL_WAIT_TIMEOUT_MS = 15000;
  const SETTLE_WAIT_TIMEOUT_MS = 4000;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function getButtonsByText(text) {
    return Array.from(document.querySelectorAll("button")).filter((button) => {
      return isVisible(button) && button.innerText.trim().toLowerCase() === text;
    });
  }

  // The coupon grid can render well after the page's load event, so wait for
  // actual content instead of guessing a fixed delay.
  // ai: claude-sonnet-5 | 2026-07-31
  function waitForClipButtons(timeoutMs) {
    return new Promise((resolve) => {
      if (getButtonsByText("clip").length > 0) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (getButtonsByText("clip").length > 0) {
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
      const clipButtons = getButtonsByText("clip");

      for (const button of clipButtons) {
        if (clicked.has(button) || button.disabled) {
          continue;
        }

        button.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(300);
        button.click();
        clicked.add(button);
        totalClicked += 1;
        clickedThisPass += 1;
        await sleep(CLICK_DELAY_MS);
      }

      if (clickedThisPass === 0) {
        await waitForClipButtons(SETTLE_WAIT_TIMEOUT_MS);
        if (getButtonsByText("clip").length > 0) {
          continue;
        }

        console.log(`Wegmans clip-all finished. Clicked ${totalClicked} Clip buttons.`);
        alert(`Finished. Clicked ${totalClicked} Clip buttons.`);
        return;
      }

      await sleep(PASS_DELAY_MS);
    }

    console.log(`Wegmans clip-all stopped after ${MAX_PASSES} passes.`);
    alert(`Stopped after ${MAX_PASSES} passes.`);
  }

  async function run() {
    await waitForClipButtons(INITIAL_WAIT_TIMEOUT_MS);
    await clickAllClipButtons();
  }

  function start() {
    run().catch((error) => {
      console.error("Wegmans clip-all script failed:", error);
      alert(`Script failed: ${error.message}`);
    });
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
})();
