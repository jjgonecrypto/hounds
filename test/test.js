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

    after(() => {
        server.close()
    })

    beforeEach(() => {
        this.options = { url: 'http://localhost:4441/' }

        this.assertErrorReceived = () => {}

        let callCount = 0
        this.quarry = new Writable({
            objectMode: true,
            write: (chunk, enc, next) => {
                callCount++
                this.assertErrorReceived(chunk, callCount)
                next()
            }
        })
    })

    describe('returns error from a single page', () => {
        beforeEach(() => {
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('detects the single console error', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 1) return
                assert.equal(this.options.url, chunk.url, 'URL is passed through')
                assert.equal('Uncaught Error: Error inline script', chunk.message, 'Page error while loading is caught')
                assert.equal(3, chunk.stackTrace.length, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('detects the error after DOM loaded', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 2) return
                assert.equal(this.options.url, chunk.url, 'URL is passed through')
                assert.equal('Uncaught Error: Error after load', chunk.message, 'Page error after DOM is loaded')
                assert.equal(3, chunk.stackTrace.length, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('then it ends the stream after it finds three items', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount > 3) assert.fail(callCount, 3, 'Expected only 3 errors to have been found')
            }

            this.hunt.on('error', done).on('end', done).pipe(this.quarry)
        })
    })


    describe('when setup on an empty page', () => {
        beforeEach(() => {
            this.options.url += 'empty.html'
        })

        describe('when released', () => {
            beforeEach(() => {
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it ends the stream when complete', done => {
                this.hunt.on('error', done).on('end', done).pipe(this.quarry)
            })
        })

        describe('when keepAlive is provided and relesed', () => {
            beforeEach(() => {
                this.options.keepAlive = true
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it does NOT end the stream when complete', done => {
                this.hunt.on('error', done).on('end', () => { throw Error('The hunt was ended early!') }).pipe(this.quarry)
                setTimeout(done, 2000)
            })
        })

    })

    describe('returns error from followed page', () => {
        beforeEach(() => {
            this.hunt = hounds.release(this.options)
        })

        it('detects the console error in a followed page', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 3) return
                assert.equal(`${this.options.url}second.html`, chunk.url, 'URL is passed through')
                assert.equal('Uncaught Error: This is supposed to happen', chunk.message, 'Page error on second.html caught')
                assert.equal(3, chunk.stackTrace.length, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })
    })

    describe('when waiting on each page for 600ms after load before moving on', () => {
        beforeEach(() => {
            this.options.waitAfterLoadedFor = 600
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('then it detects a timed out error of 500ms', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 3) return
                assert.equal(this.options.url, chunk.url, 'URL is passed through')
                assert.equal('Uncaught Error: Error after 500ms', chunk.message, 'Page error 500ms after load is caught')
                assert.equal(3, chunk.stackTrace.length, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })
    })

    // Known bug:
    // We aren't guaranteed that the URL is still valid here,
    // as it may have changed between when this error was thrown and now.
    // A better solution is for nightmare to also emit `win.webContents.getURL()`
    // as another argument in https://github.com/segmentio/nightmare/blob/master/lib/runner.js#L115
    xdescribe('when waiting on each page for 400ms after load before moving on', () => {
        beforeEach(() => {
            this.options.waitAfterLoadedFor = 400
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('then it still detects the timed out error of 500ms, with the correct, previous URL', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 3) return
                assert.equal(this.options.url, chunk.url, 'URL is passed through')
                assert.equal('Uncaught Error: Error after 500ms', chunk.message, 'Page error 500ms after load is caught')
                assert.equal(3, chunk.stackTrace.length, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })
    })
})
