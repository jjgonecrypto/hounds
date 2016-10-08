'use strict'

const Readable = require('stream').Readable

const phantomjs = require('phantomjs-prebuilt')
const webdriverio = require('webdriverio')


module.exports = () => {
    const whenPhantomStarts =
        phantomjs
        .run('--webdriver=4444')
        .then(phantom => {
            instance.leash = () => phantom.kill()
            process.on('exit', instance.leash) // ensure killed
        })

    const instance = {
        release(options) {

            const pages = { [options.url]: options }

            let errors = []

            const rs = new Readable({ objectMode: true })

            const errorHandler = e => rs.emit('error', e)

            rs._read = () => {
                if (errors.length) {
                    rs.push(errors)
                    errors = []
                }

                if (!Object.keys(pages).length) {
                    rs.push(null)
                } else {
                    setTimeout(() => rs.push(), 250)
                }
            }

            whenPhantomStarts.then(() => {
                const browser = webdriverio.remote({ desiredCapabilities: { browserName: 'phantomjs' } }).init()

                browser.url(options.url)
                .log('browser')
                .then(logs => logs.value.filter(log => log.level === 'WARNING' || log.level === 'ERROR'))
                .then(warningsAndErrors => {
                    warningsAndErrors.map(entry => {
                        const message = entry.message
                        const lines = message.split('\n').map(l => l.trim())
                        entry.message = lines[0]
                        entry.stackTrace = lines.slice(1)
                        return entry
                    }).forEach(entry => errors.push(entry))
                })
                .then(() => {
                    delete pages[options.url]
                }, errorHandler)

            }, errorHandler)

            return rs
        }
    }

    return instance

}
