'use strict'

const urlLogger = require('./urlLogger')
const errorWriter = require('./errorWriter')

const hounds = require('../')

const quarry = errorWriter()

const hunt = hounds.release({
    url: 'http://okr.mongodb.com',
    maxFollows: 5,
    waitAfterLoadedFor: 1500,
    before: nightmare => {
        return nightmare
            .viewport(1200, 800)
            .goto('http://okr.mongodb.com')
            .wait()
            .insert('input[name=Email]', process.env.HOUNDS_EXAMPLE_AUTH_USER_1)
            .click('input[type=submit]')
            .wait()
            .insert('input[name=Passwd]', process.env.HOUNDS_EXAMPLE_AUTH_PASS_1)
            .click('input[type=submit]')
            .wait(1000)
            // .then(() => {})
            // .catch(console.error)
    },
    logTo: urlLogger(),
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
