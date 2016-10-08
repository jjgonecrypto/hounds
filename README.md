#hounds

![](https://media.giphy.com/media/TVCqfX7rLyMuY/giphy.gif)

A utility to smoke test a site by releasing hounds to follow all internal links and log any console errors. Uses webdriver to drive PhantomJS 2.1.1

[![CircleCI](https://circleci.com/gh/justinjmoses/hounds.svg?style=svg)](https://circleci.com/gh/justinjmoses/hounds)

##Status

[![npm version](https://badge.fury.io/js/hounds.svg)](https://badge.fury.io/js/hounds)
[![GitHub version](https://badge.fury.io/gh/justinjmoses%2Fhounds.svg)](https://badge.fury.io/gh/justinjmoses%2Fhounds)

> Note: Currently only returns errors within the actual URL (no link following just yet)

##Releases

* ~~`0.2.0` Supports a single url with a promise~~
* `0.3.0` Stream support (instead of promises)
* `0.4.0` Handle console errors that occur after `DOMContentLoaded` (with configurable timeout)
* `0.5.0` Follow and track all internal links
* `0.6.0` Allow for `setup`/`teardown` actions in webdriver/selenium (such as login) 

##Usage

`npm i hounds`

```javascript
const hounds = require('hounds')()

const quarry = hounds.release({ url: 'http://localhost:8080' })
    .on('error', console.error)
    .on('end', () => {
        hounds.leash()
        process.exit()
    })

const ws = new Writable({ objectMode: true })
ws._write = function(chunk, enc, next) {
    if (chunk && chunk.length) console.log(chunk)
    next()
}

quarry.pipe(ws)
```

