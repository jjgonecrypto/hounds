'use strict'

const Writable = require('stream').Writable
const prettyjson = require('prettyjson') // dev dep

module.exports = () => new Writable({
    write: (chunk, enc, next) => {
        const output = prettyjson.render({ url: chunk.toString() }, {
            keysColor: 'yellow',
            dashColor: 'white',
            stringColor: 'green'
        })
        process.stdout.write(`***** Trying ${output} ******\n`)
        next()
    }
})
