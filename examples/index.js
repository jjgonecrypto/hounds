'use strict'

const express = require('express')
const path = require('path')

const hounds = require('../')
const quarry = hounds.writers.error()
const logTo = hounds.writers.url()

// start server to host
const app = express()
app.use(express.static(path.join(__dirname, '../test/fixture')))
app.listen(4441)

const hunt = hounds.release({
    url: 'http://localhost:4441',
    logTo
})
.on('error', err => {
    console.error(err)
    process.exit()
})
.on('end', process.exit)

hunt.pipe(quarry)
