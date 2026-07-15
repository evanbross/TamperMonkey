// ==UserScript==
// @name         Food Lion Clip All Coupons
// @namespace    https://www.foodlion.com/
// @version      1.1
// @description  Click all visible coupon buttons on Food Lion digital coupons pages
// @author       Evan Ross (evan@eross.com)
// @match        https://foodlion.com/savings/coupons/browse*
// @match        https://www.foodlion.com/savings/coupons/browse*
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
    await sleep(INITIAL_DELAY_MS);
    await clickAllCouponButtons();
  }

  window.addEventListener("load", () => {
    run().catch((error) => {
      console.error("Food Lion clip-all script failed:", error);
      alert(`Script failed: ${error.message}`);
    });
  });
})();
