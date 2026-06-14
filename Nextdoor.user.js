// ==UserScript==
// @name         Nextdoor
// @namespace    http://tampermonkey.net/
// @version      2026-06-11
// @description  try to take over the world!
// @author       Evan Ross (evan@eross.com)
// @match        https://nextdoor.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nextdoor.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict'

  console.log('in custom script')
  const $ = window.$

  // I wonder if by setting size to zero the server still thinks the element
  // is being displayes so it won't detect that I'm filtering it?
  // would this let them still think that ads are displayed so they get their revenue?
  function hideElement(element) {
      element.css({'width': '0',
                   'height': '0',
                   'overflow': 'hidden'})
  }

  function hidePostsContainingText(regex) {
    //const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')
    const $posts = $('div[data-testid="feed-item-card"]')
    $posts
      .filter(function () {
        const text = $(this).text()
        return regex.test(text)
      })
      .hide()
  }

  function hidePostsTitled(title) {
    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')
    $posts.has(`h2:contains('${title}')`).hide()
  }

  function hideForSale() {
    const $posts = $('div[data-testid="feed-item-card"]:has(a[href="/for_sale_and_free/"])')
    $posts.hide()
  }


  // Shared word-lists used across multiple animal-post regexes below.
  const PETS = 'cats?|dogs?|kittens?|puppy|puppies|pups?|pets?|rabbits?|kitt(?:y|ies)'
  const LOST_FOUND_VERBS = 'roaming|loose|wandering|lost|missing|rehoming|found|foster'
  const COMMON_BREEDS = 'lab setter|beagle|husky|black lab|german shepherd|bulldog|poodle|pitbulls?|chihuahua|affenpinscher|lab retriever|tabby'
  const ADJECTIVES = 'sweet|small|male|female|brown|black|white|orange|2|year old'

  function hideStuff() {
    // hide ad sidebar
    //$(
      //'.hidden-xs.hidden-sm.col-md-12.col-lg-4.info-bar-container.with-navbar'
    //).hide()

    const $posts = $('span[data-testid="feed-item-visibility-tracker"] span')

    // hide promoted posts
    $posts.has('div span:contains("Sponsored")').hide()

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
    hidePostsContainingText(/\b^please share\b/i)
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
    hidePostsContainingText(new RegExp(`\\b(${PETS}) (food|rescue)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(${PETS}|white husky|sweet baby is) (went|is|are) missing\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b((${ADJECTIVES}) )*(${COMMON_BREEDS}|cat|petsmart)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(foster|my) (kitty|puppy|cat|dog|kitten|rabbit)\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(found|missing|free|lost|looking for this|2|small)( a)*((${ADJECTIVES}) )*(poor guy|boxers?|whippet|white husky|${COMMON_BREEDS}|${PETS})\\b`, 'i'))
    hidePostsContainingText(new RegExp(`\\b(seen a|${LOST_FOUND_VERBS}) (${PETS})\\b`, 'i'))
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
  }

  setInterval(hideStuff, 500)
})()
