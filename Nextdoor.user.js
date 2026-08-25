// ==UserScript==
// @name         Nextdoor
// @namespace    http://tampermonkey.net/
// @version      2026-08-24.4
// @description  try to take over the world!
// @author       You
// @match        https://nextdoor.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nextdoor.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
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

  // ai: claude-sonnet-4-6 | 2026-06-18
  function hidePostsTitled(title) {
    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')
    hideOrLog($posts.has(`h2:contains('${title}')`), `title:${title}`)
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

  // ai: claude-sonnet-5 | 2026-08-24
  // Nextdoor no longer renders a /p/<shortcode> permalink anchor inside the
  // feed card, so the shortcode has to come from the app's own Apollo cache
  // instead of the DOM. Each card sits inside an ancestor with
  // id="feedItem_<numericId>"; that numeric id is the same one used as the
  // Apollo cache key "Post:post_<numericId>", whose detailLink.href still
  // holds "/p/<shortcode>?view=detail". The sharedPost_ prefix covers regular
  // shared posts in the news feed; other feed item types (events, business
  // posts) don't have a matching Post cache entry and fall through to null.
  function getFeedItemId($post) {
    const container = $post.closest('[id^="feedItem_"]')[0]
    const client = window.__APOLLO_CLIENT__
    if (!container || !client) return null
    const numericId = container.id.slice('feedItem_'.length)
    const entry = client.cache.extract()[`Post:post_${numericId}`]
    const href = (entry && entry.detailLink && entry.detailLink.href) || ''
    const m = href.match(/\/p\/([A-Za-z0-9_-]+)/)
    return m ? `sharedPost_${m[1]}` : null
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
    }
    return res.ok
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
    // ai: claude-sonnet-4-6 | 2026-06-18
    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')

    // hide promoted posts
    hideOrLog($posts.has('div span:contains("Sponsored")'), 'sponsored')

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
    hidePostsContainingText(/\bpawboost.com\b/i)
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
