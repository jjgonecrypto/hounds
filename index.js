'use strict'

const Readable = require('stream').Readable
const Nightmare = require('nightmare')

exports.release = (options) => {
    const pages = { [options.url]: options }

    let errors = []

    let quarry = new Readable({ objectMode: true })

    const errorHandler = e => quarry.emit('error', e)

    quarry._read = () => {
        if (errors.length) {
            errors.forEach(err => quarry.push(err))
            errors = []
        }

        if (!Object.keys(pages).length) {
            quarry.push(null)
            quarry = null
        } else {
            setTimeout(() => { if (quarry) quarry.push() }, 10)
        }
    }

    const nightmare = new Nightmare(options.nightmare)

    nightmare
        .on('page', function(type, message, stack) {
            const stackTrace = stack.split('\n').map(l => l.trim())
            errors.push({
                url: options.url,
                message,
                stackTrace
            })
        })
        .goto(options.url)
        .end()
        .then(() => {
            delete pages[options.url]
        })
        .catch(errorHandler)

    return quarry
}
