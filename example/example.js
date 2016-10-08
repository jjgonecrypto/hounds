'use strict'

const Writable = require('stream').Writable

const express = require('express')
const path = require('path')

const hounds = require('../')()

// start server to host
const app = express()
app.use(express.static(path.join(__dirname, '../test/fixture')))
app.listen(4441)

const quarry = hounds.release({ url: 'http://localhost:4441' })
    .on('error', console.error)
    .on('end', () => {
        hounds.leash()
        process.exit()
    })

const ws = Writable({ objectMode: true })
ws._write = function(chunk, enc, next) {
    if (chunk && chunk.length) {
        console.log(chunk)
    }
    next()
}

quarry.pipe(ws)
