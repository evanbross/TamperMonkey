// ==UserScript==
// @name         Lowes Foods Clip All Coupons
// @namespace    https://shop.lowesfoods.com/
// @version      1.0
// @description  Click all CLIP! buttons on the Lowes Foods promotions page, pressing Show More until every coupon is loaded
// @author       Evan Ross (evan@eross.com)
// @match        https://shop.lowesfoods.com/promotions*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lowesfoods.com
// @grant        none
// ==/UserScript==

/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * LICENSE: Personal Use Only
 * This source code is made available for personal, non-commercial use only.
 * You may read, study, and run this code for personal purposes.
 * You may NOT:
 *   - Use this code, in whole or in part, in any commercial product or service
 *   - Sell, sublicense, or otherwise monetize this code or derivatives of it
 *   - Redistribute this code without explicit written permission from ZombieTech LLC
 *
 * No warranty is provided, express or implied. Use at your own risk.
 *
 * Licensing inquiries: license@zombietech.biz
 */

// ai: claude-fable-5 | 2026-07-15
;(function () {
  'use strict'

  const INITIAL_DELAY_MS = 2500
  const CLICK_DELAY_MS = 300
  const PASS_DELAY_MS = 1200
  const SHOW_MORE_WAIT_MS = 2500
  const MAX_PASSES = 100

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  function isVisible(element) {
    if (!element) {
      return false
    }

    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    )
  }

  function elementText(element) {
    return (
      element.innerText ||
      element.textContent ||
      element.getAttribute('aria-label') ||
      element.getAttribute('value') ||
      ''
    )
      .trim()
      .toLowerCase()
  }

  function getCouponButtons() {
    const selectors = [
      'button',
      "[role='button']",
      'a',
      "input[type='button']",
      "input[type='submit']",
    ]
    // Deliberately narrow: the promotions page lives on the shop site, so
    // broader words like "add" or "save" could hit add-to-cart buttons.
    const clipTexts = ['clip', 'clip!', 'clip coupon']

    return Array.from(document.querySelectorAll(selectors.join(','))).filter((element) => {
      if (!isVisible(element) || element.disabled) {
        return false
      }

      return clipTexts.includes(elementText(element))
    })
  }

  // The promotions page renders coupons in batches (100 at a time) behind a
  // "Show More" button, so once a pass finds nothing left to clip we press it
  // to load the next batch instead of finishing.
  function getShowMoreButton() {
    return (
      Array.from(document.querySelectorAll("button, [role='button'], a")).find(
        (element) =>
          isVisible(element) && !element.disabled && elementText(element) === 'show more'
      ) || null
    )
  }

  async function clickAllCouponButtons() {
    const clicked = new WeakSet()
    let totalClicked = 0

    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
      let clickedThisPass = 0
      const couponButtons = getCouponButtons()

      for (const element of couponButtons) {
        if (clicked.has(element)) {
          continue
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await sleep(250)
        element.click()
        clicked.add(element)
        totalClicked += 1
        clickedThisPass += 1
        await sleep(CLICK_DELAY_MS)
      }

      if (clickedThisPass === 0) {
        const showMore = getShowMoreButton()
        if (showMore) {
          showMore.scrollIntoView({ behavior: 'smooth', block: 'center' })
          await sleep(250)
          showMore.click()
          await sleep(SHOW_MORE_WAIT_MS)
          continue
        }

        console.log(`Lowes Foods clip-all finished. Clicked ${totalClicked} coupon buttons.`)
        window.alert(`Finished. Clicked ${totalClicked} coupon buttons.`)
        return
      }

      await sleep(PASS_DELAY_MS)
    }

    console.log(`Lowes Foods clip-all stopped after ${MAX_PASSES} passes.`)
    window.alert(`Stopped after ${MAX_PASSES} passes.`)
  }

  async function run() {
    await sleep(INITIAL_DELAY_MS)
    await clickAllCouponButtons()
  }

  window.addEventListener('load', () => {
    run().catch((error) => {
      console.error('Lowes Foods clip-all script failed:', error)
      window.alert(`Script failed: ${error.message}`)
    })
  })
})()
