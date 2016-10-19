#hounds

![](https://media.giphy.com/media/TVCqfX7rLyMuY/giphy.gif)

A utility to smoke test a site by releasing hounds to follow all internal links and log any uncaught page errors (ignores `console.error`). Uses [nightmare](https://github.com/segmentio/nightmare) to fire up an Electron webkit browser (with optional UI).

[![CircleCI](https://circleci.com/gh/justinjmoses/hounds.svg?style=svg)](https://circleci.com/gh/justinjmoses/hounds)

##Upcoming Releases

Currently
[![npm version](https://badge.fury.io/js/hounds.svg)](https://badge.fury.io/js/hounds)
[![GitHub version](https://badge.fury.io/gh/justinjmoses%2Fhounds.svg)](https://badge.fury.io/gh/justinjmoses%2Fhounds)

> Note: Currently only returns errors within the actual URL (no link following just yet)

* ~~`0.2.0` Supports a single url with a promise~~
* ~~`0.3.0` Stream support (instead of promises)~~
    * ~~`0.3.1` Migrated to [nightmare](https://github.com/segmentio/nightmare) - 3x faster than Webdriver/Phantom2 and option to open up devTools~~
    * ~~`0.3.2` Stream usage cleanup~~
* ~~`0.4.0` Support to keep the session alive via `keepAlive`~~
* ~~`0.5.0` Handles console errors that occur after `DOMContentLoaded` (with configurable timeout `waitAfterLoadedFor (ms)`). Follows links now.~~
* ~~`0.6.0` Prevent visiting the same link twice.~~
* *[pending]* Allow max number of links to follow or timeout.
* *[pending]* Filter function to use for following links (defaults to implicit domain name, within same protocol://host:port)
* *[pending]* Allow for `setup`/`teardown` actions in nightmare (such as login) (or perhaps just use cookies) 

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
* `nightmare` All [nightmare 2.7.0 options](https://github.com/segmentio/nightmare/tree/2.7.0#nightmareoptions) are supported

##Known Issues

* `console.errors` not handled
* `/index.html` and `/` are not treated as the same URL, and are both processed
