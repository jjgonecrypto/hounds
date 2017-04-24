'use strict'

const hounds = require('../')
const quarry = hounds.writers.error()
const logTo = hounds.writers.url()

const hunt = hounds.release({
    url: 'http://www.economist.com',
    timeout: 60e3,
    waitAfterLoadedFor: 500,
    logTo,
    keepAlive: true,
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
