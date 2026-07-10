// ==UserScript==
// @name         Kroger And Harris Teeter Clip All Coupons
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Clean up Kroger pages and clip all visible coupon buttons on Kroger and Harris Teeter coupon pages
// @author       Evan Ross (evan@eross.com)
// @match        https://www.kroger.com/*
// @match        https://www.harristeeter.com/savings/cl/coupons/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kroger.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

/* globals $ */

;(function () {
  'use strict'
  console.log('in Kroger userscript')
  const INITIAL_DELAY_MS = 2500
  const CLICK_DELAY_MS = 300
  const PASS_DELAY_MS = 1200
  const MAX_PASSES = 50
  const SCROLL_STEP_PX = 600
  const SCROLL_WAIT_MS = 350
  const BOTTOM_STABLE_CHECKS = 3

  // make original price easier to read (by default it is crossed out)
  const style = document.createElement('style')

  // note: using /* */ style comments in CSS is necessary!
  style.innerHTML = `
      /* don't strike out standard price (hard to read) */
      s.kds-Price-original {
        text-decoration: none !important;
      }

      /* display details of coupons on cart page */
      .SavingsZone--text {
        -webkit-line-clamp: unset !important;
      }
    `

  const $ = window.$

  // https://stackoverflow.com/questions/8746882/jquery-contains-selector-uppercase-and-lower-case-issue
  $.expr[':'].icontains = function (a, i, m) {
    return $(a).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0
  }

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

  function getCouponButtons() {
    const selectors = [
      'button',
      '[role="button"]',
      'a',
      'input[type="button"]',
      'input[type="submit"]',
    ]
    const buttonTexts = [
      'clip',
      'clip!',
      'clip coupon',
      'load to card',
      'load coupon',
      'save',
      'add',
    ]

    return Array.from(document.querySelectorAll(selectors.join(','))).filter((element) => {
      if (!isVisible(element) || element.disabled) {
        return false
      }

      const text = (
        element.innerText ||
        element.textContent ||
        element.getAttribute('aria-label') ||
        element.getAttribute('value') ||
        ''
      )
        .trim()
        .toLowerCase()

      if (!text) {
        return false
      }

      return buttonTexts.includes(text)
    })
  }

  // ai: claude-sonnet-5 | 2026-07-10
  // Coupon pages with many already-clipped coupons render as a long/virtualized
  // list, so unclipped coupons near the bottom don't exist in the DOM until the
  // page is actually scrolled down to them. Relying on scrollIntoView of buttons
  // already found (the old approach) never advances the scroll position when the
  // top of the page has nothing left to click, so the bottom is never reached.
  // This sweeps the page from top to bottom in fixed increments every pass,
  // clicking any coupon buttons that become visible along the way.
  async function sweepPageAndClick(clicked) {
    let clickedThisSweep = 0
    let lastScrollHeight = -1
    let stableCount = 0

    window.scrollTo(0, 0)
    await sleep(SCROLL_WAIT_MS)

    for (;;) {
      const couponButtons = getCouponButtons()
      for (const element of couponButtons) {
        if (clicked.has(element)) {
          continue
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await sleep(250)
        element.click()
        clicked.add(element)
        clickedThisSweep += 1
        await sleep(CLICK_DELAY_MS)
      }

      const scrollHeight = document.documentElement.scrollHeight
      const atBottom = window.scrollY + window.innerHeight >= scrollHeight - 10

      if (atBottom) {
        stableCount = scrollHeight === lastScrollHeight ? stableCount + 1 : 0
        if (stableCount >= BOTTOM_STABLE_CHECKS) {
          break
        }
      }

      lastScrollHeight = scrollHeight
      window.scrollBy(0, SCROLL_STEP_PX)
      await sleep(SCROLL_WAIT_MS)
    }

    return clickedThisSweep
  }

  async function clickAllCouponButtons() {
    const clicked = new WeakSet()
    let totalClicked = 0

    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
      const clickedThisPass = await sweepPageAndClick(clicked)
      totalClicked += clickedThisPass

      if (clickedThisPass === 0) {
        console.log(`Kroger clip-all finished. Clicked ${totalClicked} coupon buttons.`)
        alert(`Finished. Clicked ${totalClicked} coupon buttons.`)
        return
      }

      await sleep(PASS_DELAY_MS)
    }

    console.log(`Kroger clip-all stopped after ${MAX_PASSES} passes.`)
    alert(`Stopped after ${MAX_PASSES} passes.`)
  }

  function hideStuff() {
    // hide ads
    $('.espot-image').remove()

    // more ads. the class has periods in it, so escape per
    // https://stackoverflow.com/questions/350292
    $('.AmpHocEsperanto\\.DynamicRender\\.autorotator').hide()
    $('.AmpHocEsperanto\\.DynamicRender\\.espot').hide()
    $('.AmpHocEsperanto\\.DynamicRender\\.toacontainer\\.espot').hide()
    $('div[data-testid="monetization/search-page-top"]').hide()

    // hide Snap EBT
    $('.text-positive-less-prominent:icontains(Snap)').hide()
    $('svg.text-positive-less-prominent').hide()

    if (!document.head.contains(style)) {
      console.log('appending style')
      document.head.appendChild(style)
    }
  }

  setInterval(hideStuff, 500)

  window.addEventListener('load', () => {
    window.setTimeout(() => {
      clickAllCouponButtons().catch((error) => {
        console.error('Kroger clip-all script failed:', error)
        alert(`Script failed: ${error.message}`)
      })
    }, INITIAL_DELAY_MS)
  })
})()
