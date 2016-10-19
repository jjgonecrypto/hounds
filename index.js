'use strict'

const Readable = require('stream').Readable
const Nightmare = require('nightmare')

exports.release = (options) => {
    let kickOff
    const quarry = new Readable({
        objectMode: true,
        read: () => {
            kickOff || processNextInQueue()
            kickOff = true
        }
    })

    let maxFollows = typeof options.maxFollows === 'number' ? options.maxFollows : Infinity
    const passed = {}
    const queue = [ options.url ]
    const nightmare = new Nightmare(options.nightmare)

    const session = nightmare
        .on('page', (type, message, stack, url) => {
            if (type !== 'error') return
            const stackTrace = stack.split('\n').map(l => l.trim())
            quarry.push({
                url,
                message,
                stackTrace
            })
        })

    if (typeof options.timeout === 'number') {
        setTimeout(() => maxFollows = -Infinity, options.timeout)
    }

    const processNextInQueue = () => {
        if (!queue.length || Object.keys(passed).length > maxFollows) {
            if (!options.keepAlive) {
                session.end().then(() => quarry.push(null))
            }
            return
        }
        const url = queue.shift()
        if (!url) {
            quarry.emit('error', new Error('No URL specified'))
            return
        }
        passed[url] = true
        if (options.logTo) options.logTo.write(url)
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
                anchors
                    .filter(href => !(href in passed) && !(`${href.replace(/\/$/,'')}` in passed))
                    .forEach(href => queue.push(href))
                processNextInQueue()
            })
            .catch(e => quarry.emit('error', e))
    }

    return quarry
}
