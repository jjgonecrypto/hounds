'use strict'

const Writable = require('stream').Writable
const express = require('express')
const path = require('path')

const hounds = require('../')

// start server to host
const app = express()
app.use(express.static(path.join(__dirname, '../test/fixture')))
app.listen(4441)

const hunt = hounds.release({ url: 'http://localhost:4441' })
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
