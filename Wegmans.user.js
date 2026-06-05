// ==UserScript==
// @name         Wegmans Clip All Coupons
// @namespace    https://www.wegmans.com/shop/coupons
// @version      1.0
// @description  Scroll to load all Wegmans coupons and click every Clip button
// @author       Evan Ross (evan@eross.com)
// @match        https://www.wegmans.com/shop/coupons*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const CLICK_DELAY_MS = 250;
  const PASS_DELAY_MS = 1000;

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

  async function clickAllClipButtons() {
    const clicked = new WeakSet();
    let totalClicked = 0;
    let foundNew = true;

    while (foundNew) {
      foundNew = false;
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
        foundNew = true;
        await sleep(CLICK_DELAY_MS);
      }

      if (foundNew) {
        await sleep(PASS_DELAY_MS);
      }
    }

    console.log(`Wegmans clip-all finished. Clicked ${totalClicked} Clip buttons.`);
    alert(`Finished. Clicked ${totalClicked} Clip buttons.`);
  }

  async function run() {
    await sleep(2500);
    await clickAllClipButtons();
  }

  window.addEventListener("load", () => {
    run().catch((error) => {
      console.error("Wegmans clip-all script failed:", error);
      alert(`Script failed: ${error.message}`);
    });
  });
})();
