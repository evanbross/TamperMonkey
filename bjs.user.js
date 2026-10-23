// ==UserScript==
// @name              BJ's Wholesale Club Coupon Clicker
// @namespace         bjs-wholesale-coupon
// @version           2026-10-23
// @description       Click all the coupons on BJ's Wholesale Club website
// @author            sleevetrick
// @match             https://www.bjs.com/myCoupons
// @match             https://www.bjs.com/myCoupons?source=header
// @match             https://www.bjs.com/myCoupons?source=headeribbon
// @match             https://www.bjs.com/myCoupons?source=megamenu&linkName=Coupons
// @grant             none
// @updateURL         https://gitlab.com/EvanRoss/tampermonkey/-/raw/main/bjs.user.js
// @downloadURL       https://gitlab.com/EvanRoss/tampermonkey/-/raw/main/bjs.user.js
// ==/UserScript==

// ai: claude-sonnet-5 | 2026-07-31
;(function () {
  'use strict'

  const CLIP_SELECTOR = '[data-auto-data="coupon_ClipToCard"]'
  const COUNT_SELECTOR = '[data-auto-data="coupon_categoryFilteredCouponCnt"]'
  const CLICK_DELAY_MS = 1000
  const RETRY_WAIT_TIMEOUT_MS = 3000
  const READY_WAIT_TIMEOUT_MS = 15000
  const INDEX_RELOAD_THRESHOLD = 40

  let totalCoupon = 0

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  function getClipElements() {
    return document.querySelectorAll(CLIP_SELECTOR)
  }

  // Returns the site's "remaining coupons in this category" counter, or null
  // if that element hasn't rendered yet (data still loading).
  function getRemainingCount() {
    const counter = document.querySelector(COUNT_SELECTOR)
    if (!counter || !counter.lastChild) {
      return null
    }

    const value = Number((counter.lastChild.textContent || '').replace(' Coupons', '').trim())
    return Number.isFinite(value) ? value : null
  }

  // The coupon grid and its counter render after an async fetch that
  // completes well after 'load' fires, so wait for real content instead of
  // guessing a fixed delay (the original script's bug: `window.onload =
  // setTimeout(loadFrame, 5000)` assigns setTimeout's numeric return value to
  // onload, which does nothing — loadFrame actually ran 5s after the script
  // itself was injected, not 5s after the page finished loading).
  function waitForReady(timeoutMs) {
    return new Promise((resolve) => {
      if (getClipElements().length > 0 || getRemainingCount() !== null) {
        resolve()
        return
      }

      const observer = new MutationObserver(() => {
        if (getClipElements().length > 0 || getRemainingCount() !== null) {
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

  async function clipCoupons(index) {
    const max = getRemainingCount()

    if (max !== null && (index > max || index > INDEX_RELOAD_THRESHOLD)) {
      window.scrollTo(0, 0)
      location.reload()
      return
    }

    window.scrollBy(0, 80)
    const elements = getClipElements()

    if (max === 0) {
      if (index > 0) {
        window.alert('You clipped all coupons! Please consider a donation')
      } else {
        console.log('No coupons to clip')
      }
      return
    }

    if (elements.length === 0) {
      // Nothing to click right now — either more coupons are still loading
      // or BJ's changed their markup. Wait briefly and re-check instead of
      // crashing on elements[0].click() (the original script's dead
      // `elements == "undefined"` check never caught this case, since
      // `elements` is always reassigned to a live NodeList beforehand).
      await waitForReady(RETRY_WAIT_TIMEOUT_MS)
      if (getClipElements().length === 0) {
        console.warn("BJ's clip-all: no clip buttons found — BJ's markup may have changed.")
        return
      }
      await clipCoupons(index)
      return
    }

    elements[0].click()
    totalCoupon += 1
    console.log(`Clipping Coupon #${totalCoupon}`)
    await sleep(CLICK_DELAY_MS)
    await clipCoupons(index + 1)
  }

  async function loadFrame() {
    totalCoupon = 0
    console.log('Beginning Coupon Clipping...!')
    await clipCoupons(0)
  }

  function start() {
    waitForReady(READY_WAIT_TIMEOUT_MS).then(() => {
      loadFrame().catch((error) => {
        console.error("BJ's clip-all script failed:", error)
        window.alert(`Script failed: ${error.message}`)
      })
    })
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
})()
