'use strict'

const express = require('express')
const path = require('path')
const assert = require('assert')

const hounds = require('../')

describe('hounds', function() {
    let server
    before(done => {
        const app = express()

        app.use(express.static(path.join(__dirname, '/fixture')))

        server = app.listen(4441, done)
    })

    beforeEach(() => {
        this.instance = hounds()
    })

    it('detects the single console error', done => {
        this.instance.release({ url: 'http://localhost:4441' }).then(response => {
            assert.equal(1, response.length, 'Console error is detected')
            assert.equal('Error: This is supposed to happen', response[0].message, 'Console error message is caught')
            assert.equal(1, response[0].stackTrace.length, 'Console error stacktrace is captured')
        }).then(done, done)
    })

    afterEach(() => {
        this.instance.end()
    })

    after(() => {
        server.close()
    })

})
