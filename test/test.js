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
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error inline script', 'Page error while loading is caught')
                assert.equal(chunk.stackTrace.length, 3, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('detects the error after DOM loaded', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 2) return
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error after load', 'Page error after DOM is loaded')
                assert.equal(chunk.stackTrace.length, 3, 'Page error stacktrace is captured')
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

    describe('when setup with no URL', () => {
        beforeEach(() => {
            delete this.options.url
        })

        describe('when released', () => {
            beforeEach(() => {
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it ends the stream when complete', done => {
                this.hunt
                    .on('error', () => done())
                    .on('end', () => { throw new Error('Expected error but instead was closed. ')})
                    .pipe(this.quarry)
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
                assert.equal(chunk.url, `${this.options.url}second.html`, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: This is supposed to happen', 'Page error on second.html caught')
                assert.equal(chunk.stackTrace.length, 3, 'Page error stacktrace is captured')
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
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error after 500ms', 'Page error 500ms after load is caught')
                assert.equal(chunk.stackTrace.length, 3, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })
    })


    describe('when logTo is provided', () => {
        beforeEach(() => {
            let logCount = 0
            this.options.logTo = new Writable({
                write: (chunk, enc, next) => {
                    logCount++
                    this.assertLoggedTo(chunk.toString(), logCount)
                    next()
                }
            })
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('then it detects a timed out error of 500ms', done => {
            this.assertLoggedTo = (url, logCount) => {
                if (logCount === 1)
                    assert.equal(url, this.options.url, 'Initial URL is logged')
                else if (logCount === 2)
                    assert.equal(url, `${this.options.url}first.html`, 'Following URL is logged')
                else if (logCount === 3) {
                    assert.equal(url, `${this.options.url}second.html`, 'Following URL is logged')
                    done()
                } else
                    assert.fail(logCount, 3, 'Logged should only be called three times')
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })
    })

    describe('when maxFollows set to 1', () => {
        beforeEach(() => {
            this.options.maxFollows = 1
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('then it does not detect errors on the third page', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount <= 2) return

                if (callCount > 2) {
                    assert.fail(callCount, 2, 'Expected only 1 extra page followed, so no more than 2 errors should resolve')
                    done()
                }
            }

            this.hunt.on('error', done).on('end', done).pipe(this.quarry)
        })
    })

    describe('when timeout set to 50', () => {
        beforeEach(() => {
            this.options.timeout = 50
        })

        describe('when the hunt is started', () => {
            beforeEach(() => {
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it only returns the first two errors', done => {
                this.assertErrorReceived = (chunk, callCount) => {
                    if (callCount <= 2) return

                    if (callCount > 2) {
                        assert.fail(callCount, 2, 'Expected only the first two errors to have been detected')
                        done()
                    }
                }

                this.hunt.on('error', done).on('end', done).pipe(this.quarry)
            })
        })

        describe('when waitAfterLoadedFor is set to 750ms and maxFollows is 0', () => {
            beforeEach(() => {
                this.options.maxFollows = 0
                this.options.waitAfterLoadedFor = 750
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it only returns the first three errors', done => {
                this.assertErrorReceived = (chunk, callCount) => {
                    if (callCount <= 3) return

                    if (callCount > 3) {
                        assert.fail(callCount, 3, 'Expected only the first three errors to have been detected')
                        done()
                    }
                }

                this.hunt.on('error', done).on('end', done).pipe(this.quarry)
            })
        })
    })

    // Known bug:
    // We aren't guaranteed that the URL is still valid here,
    // as it may have changed between when this error was thrown and now.
    // Even when forking nightmare to also emit `win.webContents.getURL()`
    // as another argument as in https://github.com/segmentio/nightmare/compare/master...justinjmoses:master
    // we still don't gaurantee success here.
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
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error after 500ms', 'Page error 500ms after load is caught')
                assert.equal(chunk.stackTrace.length, 3, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })
    })
})
