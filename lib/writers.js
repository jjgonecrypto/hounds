'use strict'

const Writable = require('stream').Writable
const prettyjson = require('prettyjson') // dev dep

exports.error = () => new Writable({
    objectMode: true,
    write: (chunk, enc, next) => {
        const output = prettyjson.render(chunk, { keysColor: 'yellow', dashColor: 'white', stringColor: 'red' })
        process.stdout.write('--------------------  \n ! ERROR DETECTED !\n--------------------\n')
        process.stdout.write(`${output}\n`)
        next()
    }
})

exports.url = () => new Writable({
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
