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

    // Note: this is potentially buggy (see pending test)
    // We'd prefer that the page event below emit the URL at error time
    let url

    let session = nightmare
        .on('page', function(type, message, stack) {
            const stackTrace = stack.split('\n').map(l => l.trim())
            quarry.push({
                url,
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
        url = queue.shift()
        session
            .goto(url)
            .wait(options.waitAfterLoadedFor)
            .evaluate(() => {
                /* eslint-env browser */
                const anchors = document.querySelectorAll('a[href]')
                return [].slice.call(anchors).map(a => a.href)
            })
            .then(anchors => {
                anchors = Array.isArray(anchors) ? anchors : [ anchors ]
                anchors.forEach(href => queue.push(href))
                processNextInQueue()
            })
            .catch(e => quarry.emit('error', e))
    }

    processNextInQueue()


    return quarry
}
