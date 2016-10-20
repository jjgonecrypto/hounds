'use strict'

const urlLogger = require('./urlLogger')
const errorWriter = require('./errorWriter')

const hounds = require('../')

const quarry = errorWriter()

const hunt = hounds.release({
    url: 'http://localhost:8080',
    maxFollows: 25,
    waitAfterLoadedFor: 2500,
    before: nightmare => {
        return nightmare
            .viewport(1200, 800)
            .goto('http://localhost:8080/user/login')
            .insert('input[name=username]', process.env.HOUNDS_EXAMPLE_AUTH_USER)
            .insert('input[name=password]', process.env.HOUNDS_EXAMPLE_AUTH_PASS)
            .click('button[type=submit]')
            .wait(1000)
    },
    after: nightmare => {
        return nightmare
            .goto('http://localhost:8080/user/signout')
    },
    logTo: urlLogger(),
    urlFilter: (url, domainFiltered) => {
        return /\#/.test(url) && domainFiltered
    },
    nightmare: {
        show: true, openDevTools: true
    }
})
.on('error', err => {
    console.error(err)
    process.exit()
})
.on('end', process.exit)

hunt.pipe(quarry)
