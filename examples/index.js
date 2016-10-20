'use strict'

const express = require('express')
const path = require('path')

const urlLogger = require('./urlLogger')
const errorWriter = require('./errorWriter')

const hounds = require('../')

// start server to host
const app = express()
app.use(express.static(path.join(__dirname, '../test/fixture')))
app.listen(4441)

const hunt = hounds.release({
    url: 'http://localhost:4441',
    logTo: urlLogger()
})
.on('error', err => {
    console.error(err)
    process.exit()
})
.on('end', process.exit)

const quarry = errorWriter()

hunt.pipe(quarry)
