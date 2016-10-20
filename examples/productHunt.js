'use strict'

const urlLogger = require('./urlLogger')
const errorWriter = require('./errorWriter')

const hounds = require('../')

const quarry = errorWriter()

const hunt = hounds.release({
    url: 'https://www.producthunt.com/',
    timeout: 60e3,
    waitAfterLoadedFor: 500,
    logTo: urlLogger(),
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


