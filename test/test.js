'use strict'

const Writable = require('stream').Writable

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
        const errorStream = this.instance.release({ url: 'http://localhost:4441' })

        const ws = Writable({ objectMode: true })
        ws._write = function(chunk, enc, next) {
            if (chunk && chunk.length) {
                assert.equal(1, chunk.length, 'Console error is detected')
                assert.equal('Error: This is supposed to happen', chunk[0].message, 'Console error message is caught')
                assert.equal(1, chunk[0].stackTrace.length, 'Console error stacktrace is captured')
                done()
            }
            next()
        }

        errorStream.on('error', done).pipe(ws)
    })

    afterEach(() => {
        this.instance.leash()
    })

    after(() => {
        server.close()
    })

})
