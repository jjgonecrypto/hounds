'use strict'

const Writable = require('stream').Writable
const prettyjson = require('prettyjson') // dev dep

module.exports = () => new Writable({
    objectMode: true,
    write: (chunk, enc, next) => {
        const output = prettyjson.render(chunk, { keysColor: 'yellow', dashColor: 'white', stringColor: 'red' })
        process.stdout.write('--------------------  \n ! ERROR DETECTED !\n--------------------\n')
        process.stdout.write(`${output}\n`)
        next()
    }
})
