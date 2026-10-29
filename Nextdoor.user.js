// ==UserScript==
// @name         Nextdoor
// @namespace    http://tampermonkey.net/
// @version      2026-10-29
// @description  try to take over the world!
// @author       You
// @match        https://nextdoor.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nextdoor.com
// @updateURL    https://gitlab.com/EvanRoss/tampermonkey/-/raw/main/Nextdoor.user.js
// @downloadURL  https://gitlab.com/EvanRoss/tampermonkey/-/raw/main/Nextdoor.user.js
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// @update
// ==/UserScript==

;(function () {
  'use strict'

  console.log('in custom script')
  const $ = window.$

  // ai: claude-sonnet-4-6 | 2026-06-18
  // Set to true to log filter matches to the console instead of hiding posts.
  // Helps diagnose which filter is too broad if posts disappear unexpectedly.
  // Check the browser console (F12) and look for [nextdoor] lines.
  const DEBUG = false

  // ai: claude-sonnet-4-6 | 2026-06-18
  function hideOrLog($els, label) {
    if (!$els.length) return
    if (DEBUG) {
      $els.each(function () {
        console.log(`[nextdoor] ${label} →`, $(this).text().slice(0, 120).replace(/\s+/g, ' '))
      })
    } else {
      $els.hide()
    }
  }

  function hideElement(element) {
      element.css({'width': '0',
                   'height': '0',
                   'overflow': 'hidden'})
  }

  // ai: claude-sonnet-4-6 | 2026-06-18
  function hidePostsContainingText(regex) {
    const $posts = $('div[data-testid="feed-item-card"]')
    const $matching = $posts.filter(function () {
      // ai: claude-fable-5 | 2026-07-15
      // jQuery .text() concatenates adjacent elements with no separator
      // ("5 hr agoPet sitting"), which destroys the \b word boundary the
      // filter regexes rely on. innerText keeps rendered whitespace between
      // elements; collapsing runs of whitespace (incl. NBSP and newlines) to
      // a single space lets the literal spaces in the regexes match.
      const text = (this.innerText || this.textContent || '').replace(/\s+/g, ' ')
      return regex.test(text)
    })
    hideOrLog($matching, String(regex))
  }

  // ai: claude-sonnet-5 | 2026-08-28
  // Nextdoor no longer renders these carousel/rollup widget titles ("Items
  // for sale near you", "Upcoming Events", etc.) as <h2> -- there are zero
  // <h2> elements anywhere on the page now. The title text lives in a plain
  // span[data-testid="styled-text"] instead, several levels deep inside the
  // same feed-item-visibility-tracker wrapper. Verified against the live
  // "Upcoming Events" rollup, which the old h2 selector could not see at all.
  function hidePostsTitled(title) {
    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')
    hideOrLog($posts.has(`span[data-testid="styled-text"]:contains('${title}')`), `title:${title}`)
  }

  // ai: claude-opus-5-5 | 2026-10-29
  // Ads are made invisible rather than removed: the page still downloads,
  // lays out and measures every ad exactly as if it were on screen -- images
  // (including lazy ones) load, impression pixels fire, and visibility/dwell
  // trackers (IntersectionObserver ignores visibility) see a normally sized
  // ad in the viewport. visibility:hidden stops it painting and takes it out
  // of clicks and tab focus; position:absolute takes it out of the flow so it
  // leaves no blank gap. No request is blocked and no ad node is removed.
  // display:none (what $.hide() does) was the giveaway: a zero-size box that
  // never intersects the viewport and can keep lazy images from loading.
  const CONCEAL_DECLARATIONS = 'visibility: hidden !important; position: absolute !important;'

  // ai: claude-opus-5-5 | 2026-10-29
  // One stylesheet for ads with a structural marker, so their own elements
  // are never written to at all.
  function addAdStylesheet() {
    if (DEBUG || document.getElementById('nd-ad-conceal')) return
    const style = document.createElement('style')
    style.id = 'nd-ad-conceal'
    style.textContent = `[data-feed-item-type="PROMO"] { ${CONCEAL_DECLARATIONS} }`
    ;(document.head || document.documentElement).appendChild(style)
  }

  // ai: claude-opus-5-5 | 2026-10-29
  // For ads found by their label, which CSS can't select: set the same
  // declarations inline, once per element.
  const concealed = new WeakSet()
  function concealOrLog(elements, label) {
    const fresh = elements.filter(el => !concealed.has(el))
    if (!fresh.length) return
    if (DEBUG) {
      fresh.forEach(el => console.log(`[nextdoor] ${label} →`, (el.innerText || '').slice(0, 120).replace(/\s+/g, ' ')))
      return
    }
    fresh.forEach(el => {
      el.style.setProperty('visibility', 'hidden', 'important')
      el.style.setProperty('position', 'absolute', 'important')
      concealed.add(el)
    })
  }

  // ai: claude-sonnet-5 | 2026-08-27
  // Promoted feed items carry a reliable structural marker -- data-feed-item-
  // type="PROMO" on the feed item's outer container (regular posts use
  // "POST") -- so match on that rather than on the "Sponsored" label.
  // ai: claude-opus-5-5 | 2026-10-29 -- now concealed by addAdStylesheet's rule
  // (see CONCEAL_DECLARATIONS); this only logs them in DEBUG mode.
  function hidePromoted() {
    if (DEBUG) hideOrLog($('[data-feed-item-type="PROMO"]'), 'promo')
  }

  // ai: claude-sonnet-5 | 2026-09-19
  // Nextdoor also injects a native ad unit inline near a real post's
  // comments (e.g. "Chewy · Sponsored" rendered where a top comment would
  // be) -- separate from the standalone feed-item ads hidePromoted() above
  // catches via data-feed-item-type="PROMO". This inline unit has no such
  // ancestor marker: it's served by a third-party ad network (adzen.ai)
  // and carries a hidden impression-tracking pixel
  // (img[src*="adzen.ai/dea/ugc/impression"]) alongside the same
  // obfuscated "Sponsored" label span used on the standalone ads. Match on
  // the pixel -- a far more stable signal than Nextdoor's hashed CSS
  // module class names (e.g. "goahnc0"), which have already changed once
  // in this file's history -- and hide the nearest ancestor that also
  // contains the "Sponsored" label, so only the ad block is hidden and
  // not the real post/comments it's embedded next to. Verified against a
  // live "Chewy" ad captured from the user's own session on 2026-09-19.
  const SPONSORED_LABEL_RE = /S⁠?p⁠?[oο]⁠?n⁠?s⁠?[oο]⁠?r⁠?e⁠?d/i
  function hideInlineSponsoredAds() {
    const matched = []
    $('img[src*="adzen.ai/dea/ugc/impression"]').each(function () {
      let el = this.parentElement
      for (let i = 0; i < 10 && el; i++, el = el.parentElement) {
        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ')
        if (SPONSORED_LABEL_RE.test(text)) {
          matched.push(el)
          break
        }
      }
    })
    concealOrLog(matched, 'inline-sponsored') // ai: claude-opus-5-5 | 2026-10-29
  }

  // ai: claude-opus-5-5 | 2026-10-29
  // Nextdoor now also places a native ad as the first item of a post's
  // comment thread ("Cellular Sales · Sponsored" with a "Learn more" link,
  // seen 2026-10-29 in the post detail view) -- not always the adzen.ai unit
  // above, and with no PROMO marker. Its markup hasn't been captured, so this
  // keys only on what every Nextdoor ad shows: a text element that is just
  // the "Sponsored" label (a comment that merely mentions the word holds more
  // text than that). The label is now plain "Sponsored" again on the live
  // feed ads, so the obfuscated spelling is optional in the pattern.
  //
  // From the label it climbs to the ad's own block: the last ancestor before
  // one that also holds real content (another comment, the post body, its
  // reaction or reply controls). So in a comment thread it stops at the ad's
  // list item, and it can never take a real comment or post with it.
  const SPONSORED_LEAF_RE = new RegExp(`^[·•\\s]*${SPONSORED_LABEL_RE.source}\\s*$`, 'i')
  const REAL_CONTENT_SELECTOR = [
    '[data-testid="comment-detail"]',
    '[data-testid="post-body"]',
    '[data-testid="feed-item-card"]',
    '[data-testid="reaction-button"]',
    '[data-testid="post-reply-button"]',
    '[data-testid="comment-add-reply-input"]',
  ].join(', ')
  const MAX_AD_CLIMB = 15

  // Real content in `container` that isn't part of the label's own branch.
  function holdsOtherContent(container, branch) {
    return [...container.querySelectorAll(REAL_CONTENT_SELECTOR)]
      .some(el => el !== branch && !branch.contains(el) && !el.contains(branch))
  }

  function adBlockFor(label) {
    let block = label
    for (let i = 0; i < MAX_AD_CLIMB; i++) {
      const parent = block.parentElement
      if (!parent || parent === document.body) return null
      if (holdsOtherContent(parent, block)) return block
      block = parent
    }
    return null // never found the boundary -- too risky to hide anything
  }

  function hideThreadSponsoredAds() {
    const blocks = new Set()
    for (const el of document.querySelectorAll('span, div, p')) {
      if (el.children.length || el.closest('[data-feed-item-type="PROMO"]')) continue
      if (!SPONSORED_LEAF_RE.test(el.textContent || '')) continue
      const block = adBlockFor(el)
      if (block) blocks.add(block)
    }
    concealOrLog([...blocks], 'thread-sponsored')
  }

  // ai: claude-sonnet-4-6 | 2026-06-18
  function hideForSale() {
    hideOrLog(
      $('div[data-testid="feed-item-card"]:has(a[href="/for_sale_and_free/"])'),
      'for-sale'
    )
  }

  // ai: claude-sonnet-4-6 | 2026-06-19
  function getCsrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
    return m ? m[1] : ''
  }

  // ai: claude-opus-5-5 | 2026-10-23
  // Nextdoor renders no /p/<shortcode> permalink anchor in the feed card and
  // no longer exposes window.__APOLLO_CLIENT__, so the id comes from the React
  // props of the card's id="feedItem_<numericId>" container: a few fibers up,
  // a component receives gqlFeedItem, whose post.shareId is already the
  // "sharedPost_<shortcode>" id muteFeedItem expects. Feed item types with no
  // post (events, business posts) fall through to null.
  const MAX_FIBER_DEPTH = 15

  function getFeedItemId($post) {
    const container = $post.closest('[id^="feedItem_"]')[0]
    if (!container) return null
    const fiberKey = Object.keys(container).find(k => k.startsWith('__reactFiber'))
    let fiber = fiberKey ? container[fiberKey] : null
    for (let depth = 0; fiber && depth < MAX_FIBER_DEPTH; depth++) {
      const shareId = fiber.memoizedProps?.gqlFeedItem?.post?.shareId
      if (shareId) return shareId
      fiber = fiber.return
    }
    return null
  }

  // ai: claude-sonnet-4-6 | 2026-06-19
  // Calls the muteFeedItem GraphQL mutation so Nextdoor permanently hides this
  // post from the user's feed — same effect as kebab → Hide → Confirm.
  // The persisted query hash was captured from the real site request.
  async function mutePostOnServer(feedItemId) {
    const res = await fetch('https://nextdoor.com/api/gql/muteFeedItem?', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'x-csrftoken': getCsrfToken(),
        'x-nd-cts': String(Date.now()),
        'x-nd-request-locale': 'US',
      },
      body: JSON.stringify({
        operationName: 'muteFeedItem',
        variables: { input: { feedItemId, mute: true } },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: '67b8b83a6c40357304ed1df2ca7f0a78ec90b80faa7f76a060e4ecb4e51e09dd',
          },
        },
      }),
    })
    if (!res.ok) {
      console.warn(`[nextdoor] muteFeedItem HTTP ${res.status} for ${feedItemId}`)
      return false
    }
    // ai: claude-opus-5-5 | 2026-10-23
    // GraphQL reports failures (e.g. a rotated persisted-query hash) as HTTP
    // 200 with an errors array, so res.ok alone would report success.
    const json = await res.json()
    if (json.errors || !json.data?.muteFeedItem) {
      console.warn(`[nextdoor] muteFeedItem failed for ${feedItemId}:`, json.errors || json)
      return false
    }
    return true
  }

  // ai: claude-sonnet-4-6 | 2026-06-18
  // Adds a ✕ Hide button to each post card. The button is idempotent — safe
  // to call repeatedly from setInterval since it skips cards that already
  // have one. Clicking hides the card locally AND mutes it server-side.
  function addHideButtons() {
    $('div[data-testid="feed-item-card"]').each(function () {
      const $post = $(this)
      if ($post.find('.nd-hide-btn').length) return
      $post.css('position', 'relative')
      $('<button class="nd-hide-btn">✕ Hide</button>')
        .css({
          position: 'absolute',
          top: '8px',
          right: '48px',
          // ai: claude-sonnet-5 | 2026-08-24
          // Nextdoor's comment/detail modal overlays use z-index in the
          // 1002-1051 range. This only needs to clear the post card's own
          // (unpositioned) content, so keep it well under that instead of
          // 9999, or the button bleeds through on top of open modals.
          zIndex: 2,
          padding: '3px 10px',
          background: '#e0e0e0',
          border: '1px solid #999',
          borderRadius: '999px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
          color: '#222',
          opacity: '0.6',
        })
        .on('mouseenter', function () { $(this).css('opacity', '1') })
        .on('mouseleave', function () { $(this).css('opacity', '0.6') })
        // ai: claude-sonnet-4-6 | 2026-06-19
        // feedItemId is resolved at click time, not attach time, because Nextdoor
        // renders card links asynchronously — the /p/ href may not exist yet when
        // the 500ms timer first sees the card.
        .on('click', function (e) {
          e.stopPropagation()
          const $btn = $(this)
          $btn.text('Hiding…').prop('disabled', true)
          const feedItemId = getFeedItemId($post)
          if (feedItemId) {
            mutePostOnServer(feedItemId).catch(err => console.warn('[nextdoor] muteFeedItem error:', err))
          } else {
            console.warn('[nextdoor] could not extract feedItemId; hiding locally only')
          }
          $post.hide()
        })
        .appendTo($post)
    })
  }

  // Shared word-lists used across multiple animal-post regexes below.
  const PETS = 'cats?|dogs?|kittens?|puppy|puppies|pups?|pets?|rabbits?|kitt(?:y|ies)'
  const LOST_FOUND_VERBS = 'roaming|loose|wandering|lost|missing|rehoming|found|foster'
  const COMMON_BREEDS = 'lab setter|beagle|husky|black lab|german shepherd|bulldog|poodle|pitbulls?|chihuahua|affenpinscher|lab retriever|tabby'
  const ADJECTIVES = 'two|wonderful|sweet|small|male|female|brown|black|white|orange|2|years? old'

  function hideStuff() {
    // hide promoted posts
    addAdStylesheet()
    hidePromoted()
    hideInlineSponsoredAds()
    hideThreadSponsoredAds()

    // Get rid of all the For Sale ads
    hideForSale()

    // remove animal-related posts
    hidePostsContainingText(/\b(aspca|microchipped)\b/i)
    hidePostsContainingText(/\b(cat|dog|baby) (washing service|has returned)\b/i)
    hidePostsContainingText(/\b(dog|cat|pet|house) (groomer|grooming|trainer|training|sitter|sitting|care)\b/i)
    hidePostsContainingText(/\b(missing|recognize) (this )?(dog|pup)\b/i)
    hidePostsContainingText(/\b(rehoming|rehome)( my)?( two)?\b/i)
    hidePostsContainingText(/\b(up|available) for adoption\b/i)
    hidePostsContainingText(/\b(wearing a collar|collar but no tag)\b/i)
    hidePostsContainingText(/\bplease share\b/i)
    hidePostsContainingText(/\banimal (shelter|services)\b/i)
    hidePostsContainingText(/\b(animal rescue|reunited)\b/i)
    hidePostsContainingText(/\bdog (on the loose|in my yard)\b/i)
    hidePostsContainingText(/\bdogs? running around\b/i)
    hidePostsContainingText(/\bforever homes?\b/i)
    hidePostsContainingText(/\bfrom the shelter\b/i)
    hidePostsContainingText(/\b(furbaby|fur babies|furbabies|on rover)\b/i)
    hidePostsContainingText(/\bkeep your dogs contained\b/i)
    hidePostsContainingText(/\bkitty hotel\b/i)
    hidePostsContainingText(/\bleash and collar\b/i)
    hidePostsContainingText(/\blonghaired \w* cat\b/i)
    hidePostsContainingText(/\bnail trimming\b/i)
    hidePostsContainingText(/\bpawboost.com|petfinder.com\b/i)
    hidePostsContainingText(/\b(shelter dog|bully mix)\b/i)
    hidePostsContainingText(/\bthe pampered paw\b/i)
    hidePostsContainingText(/\bwho this dog belongs to\b/i)

    // animal-related posts built from shared word lists
    hidePostsContainingText(new RegExp(`\\b(${PETS}) (${LOST_FOUND_VERBS}|available)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(${LOST_FOUND_VERBS}) (a |an |the )?((${ADJECTIVES}) )*(${PETS})\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(${PETS}) (food|rescue)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(${PETS}|white husky|sweet baby is) (went|is|are) missing\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b((${ADJECTIVES}) )*(${COMMON_BREEDS}|cat|petsmart)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(foster|my) (kitty|puppy|cat|dog|kitten|rabbit)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(found|missing|free|lost|looking for this|2|small)( a)*((${ADJECTIVES}) )*(poor guy|boxers?|whippet|white husky|${COMMON_BREEDS}|${PETS})\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(seen a|${LOST_FOUND_VERBS}) (a |an |the )?((${ADJECTIVES}) )*(${PETS})\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\bif you see (our|my) (${PETS})\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\bour beloved (${PETS}|pet)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\brecognize this (kitty|${PETS})\\b`, 'i'))

    // remove things I don't care about much
    hidePostsContainingText(/\bgarage sale\b/i)
    hidePostsContainingText(/\bhair stylist\b/i)
    hidePostsContainingText(/\bmedicaid\b/i)
    hidePostsContainingText(/\bmobile home\b/i)
    hidePostsContainingText(/\brepost missing\b/i)
//    hidePostsContainingText(/\btickets?\b/)
    hidePostsContainingText(/\byard sale\b/i)

    // hide listings
    hidePostsTitled('Items for sale near you')
    hidePostsTitled('New free listings')
    hidePostsTitled('New listings for you')

    addHideButtons()
  }

  setInterval(hideStuff, 500)
})()
