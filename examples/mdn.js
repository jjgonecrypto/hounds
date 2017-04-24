'use strict'

const hounds = require('../')
const quarry = hounds.writers.error()
const logTo = hounds.writers.url()

const hunt = hounds.release({
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
    timeout: 60e3,
    waitAfterLoadedFor: 500,
    logTo,
    urlFilter: url => {
        return /^https:\/\/developer.mozilla.org\/en-US\/docs\/Web\/JavaScript\/Guide\//.test(url)
    },
    nightmare: {
        show: true, openDevTools: true
    }
})
.on('error', err => {
    console.error(err)
    process.exit()
})
.on('end', process.exit)

hunt.pipe(quarry)


