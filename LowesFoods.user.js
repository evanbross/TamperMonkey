// ==UserScript==
// @name         Lowes Foods Clip All Coupons
// @namespace    https://shop.lowesfoods.com/
// @version      2026-10-19
// @description  Click all CLIP! buttons on the Lowes Foods promotions page, pressing Show More until every coupon is loaded
// @author       Evan Ross (evan@eross.com)
// @match        https://shop.lowesfoods.com/promotions
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lowesfoods.com
// @grant        none
// ==/UserScript==

/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

// ai: claude-fable-5 | 2026-07-15
;(function () {
  'use strict'

  const CLICK_DELAY_MS = 300
  const PASS_DELAY_MS = 1200
  const SHOW_MORE_WAIT_MS = 2500
  const MAX_PASSES = 100
  const INITIAL_WAIT_TIMEOUT_MS = 15000
  const SETTLE_WAIT_TIMEOUT_MS = 4000

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

  // The coupon grid renders after an async data fetch that completes well
  // after the page's 'load' event, so a fixed delay is not reliable — wait
  // for the grid to actually populate (or time out) instead of guessing.
  // ai: claude-sonnet-5 | 2026-07-31
  function waitForCoupons(timeoutMs) {
    return new Promise((resolve) => {
      if (getCouponButtons().length > 0 || getShowMoreButton()) {
        resolve()
        return
      }

      const observer = new MutationObserver(() => {
        if (getCouponButtons().length > 0 || getShowMoreButton()) {
          observer.disconnect()
          clearTimeout(timer)
          resolve()
        }
      })

      observer.observe(document.body, { childList: true, subtree: true })

      const timer = setTimeout(() => {
        observer.disconnect()
        resolve()
      }, timeoutMs)
    })
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

        // ai: claude-sonnet-5 | 2026-07-31
        await waitForCoupons(SETTLE_WAIT_TIMEOUT_MS)
        if (getCouponButtons().length > 0 || getShowMoreButton()) {
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
    await waitForCoupons(INITIAL_WAIT_TIMEOUT_MS)
    await clickAllCouponButtons()
  }

  const PROMOTIONS_PATH_RE = /^\/promotions/
  let running = false

  function isPromotionsPage() {
    return PROMOTIONS_PATH_RE.test(location.pathname)
  }

  function start() {
    if (running || !isPromotionsPage()) {
      return
    }
    running = true
    run()
      .catch((error) => {
        console.error('Lowes Foods clip-all script failed:', error)
        window.alert(`Script failed: ${error.message}`)
      })
      .finally(() => {
        running = false
      })
  }

  // @match now covers the whole site (not just /promotions) so this script is
  // present from the moment you land on shop.lowesfoods.com. Like Food Lion,
  // Lowes Foods is a client-routed SPA: navigating to Promotions from
  // elsewhere on the site updates the URL via history.pushState instead of a
  // real navigation, which never fires a fresh "load" event and never
  // triggers Tampermonkey's own document-match re-injection (that only
  // happens on an actual navigation to a matching URL). Hooking
  // pushState/replaceState/popstate lets the script notice the SPA route
  // change itself and start once the path becomes the promotions page.
  // ai: claude-sonnet-5 | 2026-08-14
  function watchForPromotionsRoute() {
    const originalPushState = history.pushState
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args)
      start()
      return result
    }

    const originalReplaceState = history.replaceState
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args)
      start()
      return result
    }

    window.addEventListener('popstate', start)
  }

  // On a real page load, "load" hasn't fired yet when this attaches, so the
  // listener catches it. But when navigating here via the site's own SPA
  // routing, Tampermonkey re-injects the script for the new URL after "load"
  // has already fired, so the event is missed unless we check readyState here.
  // ai: claude-sonnet-5 | 2026-08-12
  if (document.readyState === 'complete') {
    start()
  } else {
    window.addEventListener('load', start)
  }
  watchForPromotionsRoute()
})()
