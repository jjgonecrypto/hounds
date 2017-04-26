'use strict'

const urlHelper = require('url')
const Readable = require('stream').Readable
const Nightmare = require('nightmare')

module.exports = (options) => {
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

    if (typeof options.timeout === 'number') {
        setTimeout(() => maxFollows = -Infinity, options.timeout)
    }

    const domainFilter = url => {
        const baseUrlParts = urlHelper.parse(options.url)
        const currentUrlParts = urlHelper.parse(url)
        return baseUrlParts.host === currentUrlParts.host
    }

    const urlFilter = url => {
        if (options.urlFilter) return options.urlFilter(url, domainFilter(url))
        else return domainFilter(url)
    }

    const processNextInQueue = () => {
        if (!queue.length || Object.keys(passed).length > maxFollows) {
            if (options.after) session = options.after(session)

            if (!options.keepAlive) {
                session.end().then(() => quarry.push(null))
            } else {
                session.then() // ensure nightmare acts on last action in `after`, if any
            }
            return
        }

        if (options.before && !kickOff) {
            options.before(nightmare).then(processNextInQueue)
            return
        }

        const url = queue.shift()

        if (!url) {
            quarry.emit('error', new Error('No URL specified'))
            return
        }

        passed[url] = true
        if (options.logTo && quarry._readableState.flowing) options.logTo.write(url)

        session = session
            .goto(url)
            .wait(options.waitAfterLoadedFor)

        if (options.screenshot) session = session.screenshot(options.screenshot(url))

        session.evaluate(() => {
            /* eslint-env browser */
            const anchors = document.querySelectorAll('a[href]')
            return [].slice.call(anchors).map(a => a.href)
        })
        .then(anchors => {
            anchors = new Set(Array.isArray(anchors) ? anchors : [ anchors ]) // unique values only
            Array.from(anchors)
                .filter(href => queue.indexOf(href) === -1 && !(href in passed) && !(`${href.replace(/\/$/,'')}` in passed))
                .filter(urlFilter)
                .forEach(href => queue.push(href))
        })
        .then(processNextInQueue)
        .catch(e => quarry.emit('error', e))
    }

    return quarry
}
