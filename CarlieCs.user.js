// ==UserScript==
// @name         Carlie C's Clip All Coupons
// @namespace    https://www.carliecs.com/
// @version      1.0
// @description  Click all visible Clip buttons on Carlie C's digital coupons pages and related AppCard frames
// @author       Evan Ross (evan@eross.com)
// @match        https://www.carliecs.com/digital-coupons*
// @match        https://www.carliecs.com/fam-rewards*
// @match        https://*.appcard.com/*
// @match        https://appcard.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const INITIAL_DELAY_MS = 2500;
  const CLICK_DELAY_MS = 300;
  const PASS_DELAY_MS = 1200;
  const MAX_PASSES = 50;

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
    await sleep(INITIAL_DELAY_MS);
    await clickAllClipButtons();
  }

  window.addEventListener("load", () => {
    run().catch((error) => {
      console.error("Carlie C's clip-all script failed:", error);
      alert(`Script failed: ${error.message}`);
    });
  });
})();
