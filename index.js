'use strict'

const Readable = require('stream').Readable
const Nightmare = require('nightmare')

exports.release = (options) => {
    const quarry = new Readable({
        objectMode: true,
        read: () => {}
    })

    const queue = [ options.url ]
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

    const processNextInQueue = () => {
        if (!queue.length) {
            if (!options.keepAlive) {
                session.end().then(() => quarry.push(null))
            }

            return
        }
        const url = queue.pop()
        session
            .goto(url)
            .wait(options.waitAfterLoadedFor)
            .then(() => {
                processNextInQueue()
            })
            .catch(e => quarry.emit('error', e))
    }

    processNextInQueue()


    return quarry
}
