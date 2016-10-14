'use strict'

const Readable = require('stream').Readable
const Nightmare = require('nightmare')

exports.release = (options) => {
    const quarry = new Readable({
        objectMode: true,
        read: () => {}
    })

    const nightmare = new Nightmare(options.nightmare)

    let session = nightmare
        .on('page', function(type, message, stack) {
            const stackTrace = stack.split('\n').map(l => l.trim())
            quarry.push({
                url: options.url,
                message,
                stackTrace
            })
        })
        .goto(options.url)

    if (!options.keepAlive) {
        session = session.end().then(() => {
            quarry.push(null)
        })
    }

    session.catch(e => quarry.emit('error', e))

    return quarry
}
