'use strict'

const Writable = require('stream').Writable
const express = require('express')
const path = require('path')
const prettyjson = require('prettyjson') // dev dep

const hounds = require('../')

// start server to host
const app = express()
app.use(express.static(path.join(__dirname, '../test/fixture')))
app.listen(4441)

const hunt = hounds.release({
    // url: 'http://localhost:4441/',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    // url: 'http://motherboard.vice.com/en_us',
    // keepAlive: true,
    // maxFollows: 1,
    timeout: 10000,
    logTo: new Writable({
        write: (chunk, enc, next) => {
            const output = prettyjson.render({ url: chunk.toString() }, {
                keysColor: 'yellow',
                dashColor: 'white',
                stringColor: 'green'
            })
            process.stdout.write(`***** Trying ${output} ******\n`)
            next()
        }
    }),
    // waitAfterLoadedFor: 500,
    nightmare: {
        // show: true, openDevTools: true
    }
}).on('error', console.error)
.on('end', process.exit)

const quarry = new Writable({
    objectMode: true,
    write: (chunk, enc, next) => {
        const output = prettyjson.render(chunk, { keysColor: 'yellow', dashColor: 'white', stringColor: 'red' })
        process.stdout.write('--------------------  \n ! ERROR DETECTED !\n--------------------\n')
        process.stdout.write(`${output}\n`)
        next()
    }
})

hunt.pipe(quarry)
