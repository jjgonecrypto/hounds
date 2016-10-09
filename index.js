'use strict'

const Readable = require('stream').Readable
const Nightmare = require('nightmare')

exports.release = (options) => {
    const pages = { [options.url]: options }

    const quarry = new Readable({
        objectMode: true,
        read: () => {}
    })

    const nightmare = new Nightmare(options.nightmare)

    nightmare
        .on('page', function(type, message, stack) {
            const stackTrace = stack.split('\n').map(l => l.trim())
            quarry.push({
                url: options.url,
                message,
                stackTrace
            })
        })
        .goto(options.url)
        .end()
        .then(() => {
            delete pages[options.url]
            quarry.push(null)
        })
        .catch(e => quarry.emit('error', e))

    return quarry
}
