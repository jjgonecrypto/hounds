'use strict'

const urlLogger = require('./urlLogger')
const errorWriter = require('./errorWriter')

const hounds = require('../')

const quarry = errorWriter()

const hunt = hounds.release({
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
    timeout: 60e3,
    waitAfterLoadedFor: 500,
    logTo: urlLogger(),
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


