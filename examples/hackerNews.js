'use strict'

const urlLogger = require('./urlLogger')
const errorWriter = require('./errorWriter')

const hounds = require('../')

const quarry = errorWriter()

const hunt = hounds.release({
    url: 'http://news.ycombinator.com',
    timeout: 60e3,
    waitAfterLoadedFor: 500,
    logTo: urlLogger(),
    urlFilter: url => {
        // external only
        return !/^https?:\/\/[a-zA-Z0-9]+\.?ycombinator\.com/.test(url)
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


