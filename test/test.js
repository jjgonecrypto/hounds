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
        this.options = { url: 'http://localhost:4441' }
        this.quarry = hounds.release(this.options)

        this.assertErrorReceived = () => {}

        this.output = new Writable({ objectMode: true })
        let callCount = 0
        this.output._write = (chunk, enc, next) => {
            if (chunk) {
                callCount++
                this.assertErrorReceived(chunk, callCount)
            }

            next()
        }
    })

    it('detects the single console error', done => {
        this.assertErrorReceived = (chunk, callCount) => {
            if (callCount !== 1) return
            assert.equal(this.options.url, chunk.url, 'URL is passed through')
            assert.equal('Uncaught Error: Error inline script', chunk.message, 'Page error while loading is caught')
            assert.equal(3, chunk.stackTrace.length, 'Page error stacktrace is captured')
            done()
        }

        this.quarry.on('error', done).pipe(this.output)
    })

    it('detects the error after DOM loaded', done => {
        this.assertErrorReceived = (chunk, callCount) => {
            if (callCount !== 2) return
            assert.equal(this.options.url, chunk.url, 'URL is passed through')
            assert.equal('Uncaught Error: Error after load', chunk.message, 'Page error after DOM is loaded')
            assert.equal(3, chunk.stackTrace.length, 'Page error stacktrace is captured')
            done()
        }

        this.quarry.on('error', done).pipe(this.output)
    })

    after(() => {
        server.close()
    })

})
