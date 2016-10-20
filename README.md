#hounds

*Release the hounds* and smoke test any site. Sanity check after a large refactor, or plug into your CI tool of choice.<br />
![](https://media.giphy.com/media/TVCqfX7rLyMuY/giphy.gif)

The beasts will follow all links (internal or otherwise) and round up any uncaught page errors. As a seamless unit, they will scour the field for their quarry by spanning out, containing an area, and expanding (breadth-first search). 

Uses [nightmare](https://github.com/segmentio/nightmare) to fire up an Electron webkit browser (with optional UI).

[![npm version](https://badge.fury.io/js/hounds.svg)](https://badge.fury.io/js/hounds)
[![GitHub version](https://badge.fury.io/gh/justinjmoses%2Fhounds.svg)](https://badge.fury.io/gh/justinjmoses%2Fhounds) [![CircleCI](https://circleci.com/gh/justinjmoses/hounds.svg?style=svg)](https://circleci.com/gh/justinjmoses/hounds)

##Usage

`npm i hounds`

```javascript
const hounds = require('hounds')
const hunt = hounds.release({ url: 'http://localhost:8080' })
    .on('error', console.error)
    .on('end', process.exit)

const quarry = new Writable({
    objectMode: true,
    write: (chunk, enc, next) => {
        console.dir(chunk)
        next()
    }
})

hunt.pipe(quarry)
```

To show the Electron UI, with devTools open, and keep both alive, use the following settings:

```javascript
const hunt = hounds.release({
    url: '...',
    keepAlive: true,
    nightmare: {
        show: true, openDevTools: true
    }
}).on('error', console.error)
```

##Options
* `url` base URL to start from
* `keepAlive` don't end the stream or the nightmare session when complete (when combined with `nightmare.show`, allows you to interact with the browser when done).
* `waitAfterLoadedFor` The number of milliseconds to wait after each page is loaded before following the next link in the queue
* `maxFollows` The maximum number of links to follow and track (the default is `Infinity`)
* `timeout` The number of ms before ending the session. When the timeout is reached, the system will end on the next attempt to read from the queue (Note: this has no use when `keepAlive` is `true`). (No default)
* `logTo` An optional writable stream that all URLs attempting to be processed will be written to.
* `urlFilter` An optional predicate function, taking the current `url` as a parameter, and returning `true` or `false` as to whether or not to include it in the hunt. Second argument of `domainFiltered` is a bool stating whether or not the host matches (use it if you'd like to include that check in your filter)
* `before` and `after` callbacks receive nightmare instance and if defined, must return it (see [examples/preAuth.js](examples/preAuth.jss#L14-L26))
* `nightmare` All [nightmare 2.8.0 options](https://github.com/segmentio/nightmare/tree/2.8.0#nightmareoptions) are supported

##Known Issues
* `console.errors` not currently handled
* `404`s are not currently handled
* `/index.html` and `/` are not treated as the same URL, and are both processed
* Subdomains (including `www`) are treated as different hosts
* `unpipe()` won't stop the stream from finding results
* links which are hidden in the page are still detected, could use [jQuery's approach](https://github.com/jquery/jquery/blob/2d4f53416e5f74fa98e0c1d66b6f3c285a12f0ce/test/data/jquery-1.9.1.js#L7474) as an optional workaround

##Examples
Try out `node examples` for a basic example based on the test fixtures

![image](https://cloud.githubusercontent.com/assets/799038/19538754/93f3ceda-9623-11e6-92ed-51ecb40393dd.png)

Unleash them on the latest sites from HackerNews via `node examples/hackerNews`

Or use them against a local site with auth (see [examples/preAuth.js](examples/preAuth.jss#L14-L26))

##Changelog
* ~~`0.2.0` Supports a single url with a promise~~
* ~~`0.3.0` Stream support (instead of promises)~~
    * ~~`0.3.1` Migrated to [nightmare](https://github.com/segmentio/nightmare) - 3x faster than Webdriver/Phantom2 and option to open up devTools~~
    * ~~`0.3.2` Stream usage cleanup~~
* ~~`0.4.0` Support to keep the session alive via `keepAlive`~~
* ~~`0.5.0` Handles console errors that occur after `DOMContentLoaded` (with configurable timeout `waitAfterLoadedFor (ms)`). Follows links now.~~
* ~~`0.6.0` Prevent visiting the same link twice.~~
* ~~`0.7.0` Allow max number of links to follow or timeout.~~
* ~~`0.8.0` Support for logTo writable stream for URLs processed, and correct error emitting bugfix.~~
* ~~`0.9.0` By default, only links within same `hostname:port` are considered. Override with predicate function `urlFilter`~~
* ~~`0.10.0` `urlFilter` also receives result of domain check as second argument. Bug fix: no dupes anchors in the one page~~
* ~~`1.0.0` `before` and `after` callbacks receive nightmare instance and if defined, must return it (see [examples/preAuth.js](https://github.com/justinjmoses/hounds/blob/master/examples/preAuth.js))
