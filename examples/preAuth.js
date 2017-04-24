'use strict'

const hounds = require('../')
const quarry = hounds.writers.error()
const logTo = hounds.writers.url()

const hunt = hounds.release({
    url: 'http://localhost:8080',
    maxFollows: 25,
    waitAfterLoadedFor: 5000,
    before: nightmare => {
        return nightmare
            .viewport(1200, 800)
            .goto('http://localhost:8080/user#/login')
            .type('input[name=username]', process.env.HOUNDS_EXAMPLE_AUTH_USER)
            .type('input[name=password]', process.env.HOUNDS_EXAMPLE_AUTH_PASS)
            .click('button[type=submit]')
            .wait(2000)
    },
    after: nightmare => {
        return nightmare
            .goto('http://localhost:8080/user/signout')
    },
    keepAlive: true,
    logTo,
    urlFilter: (url, domainFiltered) => {
        return /\#./.test(url) && domainFiltered
    },
    nightmare: {
        show: true, openDevTools: { mode: 'detach' }
    }
})
.on('error', err => {
    console.error(err)
    process.exit()
})
.on('end', process.exit)

hunt.pipe(quarry)
