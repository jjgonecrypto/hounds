'use strict'

const phantomjs = require('phantomjs-prebuilt')
const webdriverio = require('webdriverio')

module.exports = () => {
    const whenPhantomStarts = phantomjs.run('--webdriver=4444').then(phantom => instance.leash = () => phantom.kill())

    const instance = {
        release(options) {
            return whenPhantomStarts.then(() => {
                const browser = webdriverio.remote({ desiredCapabilities: { browserName: 'phantomjs' } }).init()


                // const anchors = page
                // .then(entries => {
                //     return page.getAttribute('a[href]', 'href').then(anchors => { anchors, entries })
                // })

                return browser.url(options.url)
                .log('browser')
                .then(logs => logs.value.filter(log => log.level === 'WARNING' || log.level === 'ERROR'))
                .then(warningsAndErrors => warningsAndErrors.map(entry => {
                    const message = entry.message
                    const lines = message.split('\n').map(l => l.trim())
                    entry.message = lines[0]
                    entry.stackTrace = lines.slice(1)
                    return entry
                }))

            })
        }
    }

    return instance

}
