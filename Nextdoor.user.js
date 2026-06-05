// ==UserScript==
// @name         Nextdoor
// @namespace    http://tampermonkey.net/
// @version      2024-09-29
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
    hidePostsContainingText(/\bforever homes*\b/i)
    hidePostsContainingText(/\b(dog|cat) (food|rescue)\b/i)
    hidePostsContainingText(/\b(found|missing|free|lost|looking for this)( a)*( sweet)*( male| female)* (poor guy|boxers?|pup|whippet|pet|black lab|cat|dog|kitten|white husky)\b/i)
    hidePostsContainingText(/\b(cat|dog|dogs|kitten|white husky|sweet baby is) (went|is|are) missing\b/i)
    hidePostsContainingText(/\bif you see (our|my) (cat|dog|kitten|pup|puppy)\b/i)
    hidePostsContainingText(/\b(foster|my) (kitty|puppy|cat|dog|kitten|rabbit)\b/i)
    hidePostsContainingText(/\b(cat|dog|dogs|kitten|puppy|puppies) (roaming|loose|wandering|available)\b/i)
    hidePostsContainingText(/\b(seen a|loose|wandering) (cat|dog|dogs|kitten)\b/i)
    hidePostsContainingText(/\b(wearing a collar)|(collar but no tag)\b/i)
    hidePostsContainingText(/\b(cat|dog|baby) has returned\b/i)
    hidePostsContainingText(/\banimal rescue|reunited\b/i)
    hidePostsContainingText(/\bdog in my yard\b/i)
    hidePostsContainingText(/\bdogs? running around\b/i)
    hidePostsContainingText(/\brecognize this (kitty|cat|dog|puppy)\b/i)
    hidePostsContainingText(/\bkitty hotel\b/i)
    hidePostsContainingText(/\bfurbaby|fur babies|furbabies|on rover\b/i)
    hidePostsContainingText(/\bkeep your dogs contained\b/i)
    hidePostsContainingText(/\b(year old |male |female |orange |sweet |small |white )*(lab setter|cat|husky|black lab|german shepherd|bulldog|poodle|pitbull|chihuahua|dog |affenpinscher|petsmart|lab retriever|tabby)\b/i)
    hidePostsContainingText(/\blost( my)? (puppy|cat|dog)\b/i)
    hidePostsContainingText(/\b^please share\b/i)
    hidePostsContainingText(/\b(rehoming|rehome)( my)?( two)?\b/i)
    hidePostsContainingText(/\bwho this dog belongs to\b/i)
    hidePostsContainingText(/\bour beloved (dog|cat|puppy|kitten|pet)\b/i)
    hidePostsContainingText(/\b(dog|cat|pet|house) (groomer|grooming|trainer|training|sitter|sitting|care)\b/i)
    hidePostsContainingText(/\bnail trimming\b/i)
    hidePostsContainingText(/\blonghaired \w* cat\b/i)
    hidePostsContainingText(/\b(up|available) for adoption\b/i)
    hidePostsContainingText(/\banimal (shelter|services)\b/i)
    hidePostsContainingText(/\bthe pampered paw\b/i)
    hidePostsContainingText(/\b(missing|recognize) this (dog|pup)\b/i)
    hidePostsContainingText(/\bpawboost.com\b/i)
    hidePostsContainingText(/\bfrom the shelter\b/i)
    hidePostsContainingText(/\bshelter dog|bully mix\b/i)
    hidePostsContainingText(/\bleash and collar\b/i)

    // remove things I don't care about much
    hidePostsContainingText(/\bmobile home\b/i)
//    hidePostsContainingText(/\btickets?\b/)
    hidePostsContainingText(/\bhair stylist\b/i)
    hidePostsContainingText(/\bmedicaid\b/i)
    hidePostsContainingText(/\bgarage sale\b/i)
    hidePostsContainingText(/\byard sale\b/i)
    hidePostsContainingText(/\repost missing\b/i)

    // hide listings
    hidePostsTitled('Items for sale near you')
    hidePostsTitled('New free listings')
    hidePostsTitled('New listings for you')
  }

  setInterval(hideStuff, 500)
})()
