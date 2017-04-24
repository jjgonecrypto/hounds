'use strict'

const Writable = require('stream').Writable

const express = require('express')
const path = require('path')
const assert = require('assert')
const sinon = require('sinon')

const Nightmare = require('nightmare')

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
        this.assertLoggedTo = () => {}

        let logCount = 0
        this.options = {
            url: 'http://localhost:4441/',

            logTo: new Writable({
                write: (chunk, enc, next) => {
                    logCount++
                    this.assertLoggedTo(chunk.toString(), logCount)
                    next()
                }
            })
        }

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

        it('detects the first console error', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 1) return
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error inline script', 'Page error while loading is caught')
                assert.equal(chunk.stackTrace.length, 2, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('detects the second error after DOM loaded', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 2) return
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error after load', 'Page error after DOM is loaded')
                assert.equal(chunk.stackTrace.length, 2, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('detects the third error from a followed page', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 3) return
                assert.equal(chunk.url, `${this.options.url}second.html`, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: This is supposed to happen', 'Page error on second.html caught')
                assert.equal(chunk.stackTrace.length, 2, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('ends the stream after it finds three items', done => {
            sinon.spy(this, 'assertErrorReceived')

            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.equal(this.assertErrorReceived.callCount, 3, 'Should have emitted three events only')
                    done()
                })
                .pipe(this.quarry)
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
                sinon.spy(this, 'assertErrorReceived')

                this.hunt
                    .on('error', done)
                    .on('end', () => {
                        assert.equal(this.assertErrorReceived.callCount, 0, 'No errors should have been emitted')
                        done()
                    })
                    .pipe(this.quarry)
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

    describe('when setup on a page with an external link', () => {
        beforeEach(() => {
            this.options.url += 'external.html'
        })

        describe('when released', () => {
            beforeEach(() => {
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it does not process any internal links', done => {
                this.assertLoggedTo = (url, logCount) => {
                    if (logCount !== 1) {
                        assert.fail(url, '', 'No URL should be visited')
                        done()
                    }
                }

                sinon.spy(this, 'assertLoggedTo')

                this.hunt
                    .on('error', done)
                    .on('end', () => {
                        assert.equal(this.assertLoggedTo.callCount, 1, 'Logged should only be called once')
                        done()
                    })
                    .pipe(this.quarry)
            })
        })
    })

    describe('when setup on a page with longer link paths', () => {
        let baseUrl
        beforeEach(() => {
            baseUrl = this.options.url
            this.options.url += 'filter.html'
        })

        describe('when released', () => {
            beforeEach(() => {
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it does not add extra links that are already in the queue', done => {
                this.assertLoggedTo = (url, logCount) => {
                    if (logCount === 1)
                        assert.equal(url, `${this.options.url}`, 'Initial URL is logged')
                    else if (logCount === 2)
                        assert.equal(url, `${baseUrl}filter/1.html`, 'Following URL is logged')
                    else if (logCount === 3)
                        assert.equal(url, `${baseUrl}filter/2.html`, 'Following URL is logged')
                    else if (logCount === 4)
                        assert.equal(url, `${baseUrl}first.html`, 'Following URL is logged')
                    else if (logCount === 5)
                        assert.equal(url, `${baseUrl}second.html`, 'Following URL is logged')
                    else if (logCount === 6)
                        assert.equal(url, `${baseUrl}`, 'Following URL is logged')
                }
                sinon.spy(this, 'assertLoggedTo')

                this.hunt
                    .on('error', done)
                    .on('end', () => {
                        assert.equal(this.assertLoggedTo.callCount, 6, 'Logged should only be called six times')
                        done()
                    })
                    .pipe(this.quarry)
            })
        })

        describe('when setup with urlFilter', () => {
            beforeEach(() => {
                this.options.urlFilter = url => /filter\//.test(url)
            })

            describe('when released', () => {
                beforeEach(() => {
                    this.hunt = hounds.release(this.options)
                })

                afterEach(() => {
                    this.hunt.unpipe(this.quarry)
                })

                it('then it honors the urlFilter predicate and only processes those links', done => {
                    this.assertLoggedTo = (url, logCount) => {
                        if (logCount === 1)
                            assert.equal(url, `${this.options.url}`, 'Initial URL is logged')
                        else if (logCount === 2)
                            assert.equal(url, `${baseUrl}filter/1.html`, 'Following URL is logged')
                        else if (logCount === 3)
                            assert.equal(url, `${baseUrl}filter/2.html`, 'Following URL is logged')
                    }
                    sinon.spy(this, 'assertLoggedTo')

                    this.hunt
                        .on('error', done)
                        .on('end', () => {
                            assert.equal(this.assertLoggedTo.callCount, 3, 'Logged should only be called three times')
                            done()
                        })
                        .pipe(this.quarry)
                })
            })
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

        it('then the third error is the original page\'s timed out error at 500ms', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 3) return
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error after 500ms', 'Page error 500ms after load is caught')
                assert.equal(chunk.stackTrace.length, 2, 'Page error stacktrace is captured')
            }

            this.hunt.on('error', done).on('end', done).pipe(this.quarry)
        })
    })


    describe('when logTo is provided', () => {
        beforeEach(() => {
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
                else if (logCount === 3)
                    assert.equal(url, `${this.options.url}second.html`, 'Following URL is logged')
            }

            sinon.spy(this, 'assertLoggedTo')

            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.equal(this.assertLoggedTo.callCount, 3, 'Logged should only be called three times')
                    done()
                })
                .pipe(this.quarry)
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
            sinon.spy(this, 'assertErrorReceived')

            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.equal(
                        this.assertErrorReceived.callCount,
                        2,
                        'Expected only 1 extra page followed, so no more than 2 errors should resolve'
                    )
                    done()
                })
                .pipe(this.quarry)
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
                sinon.spy(this, 'assertErrorReceived')
                this.hunt
                    .on('error', done)
                    .on('end', () => {
                        assert.equal(this.assertErrorReceived.callCount, 2, 'Should have emitted two errors only')
                        done()
                    })
                    .pipe(this.quarry)
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
                sinon.spy(this, 'assertErrorReceived')
                this.hunt
                    .on('error', done)
                    .on('end', () => {
                        assert.equal(this.assertErrorReceived.callCount, 3, 'Should have emitted three errors only')
                        done()
                    })
                    .pipe(this.quarry)
            })
        })
    })

    describe('when before provided', () => {
        beforeEach(() => {
            this.options.before = sinon.stub().returnsArg(0)
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('then it is invoked', () => {
            assert.equal(this.options.before.callCount, 1, 'Before must be invoked')
        })

        it('and it passes through the nightmare instance', () => {
            assert.ok(this.options.before.firstCall.args[0] instanceof Nightmare, 'Before must be invoked with nightmare instance')
        })
    })

    describe('when after provided', () => {
        beforeEach(() => {
            this.options.after = sinon.stub().returnsArg(0)
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('then it is invoked', done => {
            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.equal(this.options.after.callCount, 1, 'After must be invoked')
                    done()
                })
                .pipe(this.quarry)
        })

        it('and it passes through the nightmare instance', done => {
            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.ok(this.options.after.firstCall.args[0] instanceof Nightmare, 'After must be invoked with nightmare instance')
                    done()
                })
                .pipe(this.quarry)
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
                assert.equal(chunk.stackTrace.length, 2, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })
    })
})
