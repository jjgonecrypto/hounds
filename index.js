'use strict'

const Readable = require('stream').Readable
const Nightmare = require('nightmare')

exports.release = (options) => {
    const quarry = new Readable({
        objectMode: true,
        read: () => {}
    })

    const passed = {}
    const queue = [ options.url ]
    const nightmare = new Nightmare(options.nightmare)

    let session = nightmare
        .on('page', (type, message, stack, url) => {
            if (type !== 'error') return
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
        const url = queue.shift()
        passed[url] = passed[`${url}/`] = true
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
                anchors.filter(href => !(href in passed)).forEach(href => queue.push(href))
                processNextInQueue()
            })
            .catch(e => quarry.emit('error', e))
    }

    processNextInQueue()


    return quarry
}
