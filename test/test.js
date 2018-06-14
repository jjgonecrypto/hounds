'use strict'

const Writable = require('stream').Writable

const express = require('express')
const path = require('path')
const fs = require('fs-extra')
const assert = require('assert')
const sinon = require('sinon')

const Nightmare = require('nightmare')

const hounds = require('../')

describe('hounds', function() {
    this.timeout(20e3)

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

        this.filterEvents = () => { return true }
        let callCount = 0
        this.quarry = new Writable({
            objectMode: true,
            write: (chunk, enc, next) => {
                if (!this.filterEvents(chunk)) return next()
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
                if (callCount !== 2) return
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.type, 'error', 'Console event type is error')
                assert.equal(chunk.message, 'error before load', 'Console message is reported correctly')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('detects the first script error', done => {
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
                if (callCount !== 3) return
                assert.equal(chunk.url, this.options.url, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: Error after load', 'Page error after DOM is loaded')
                assert.equal(chunk.stackTrace.length, 2, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('detects the third error from a followed page', done => {
            this.assertErrorReceived = (chunk, callCount) => {
                if (callCount !== 4) return
                assert.equal(chunk.url, `${this.options.url}second.html`, 'URL is passed through')
                assert.equal(chunk.message, 'Uncaught Error: This is supposed to happen', 'Page error on second.html caught')
                assert.equal(chunk.stackTrace.length, 2, 'Page error stacktrace is captured')
                done()
            }

            this.hunt.on('error', done).pipe(this.quarry)
        })

        it('ends the stream after it finds four items', done => {
            sinon.spy(this, 'assertErrorReceived')

            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.equal(this.assertErrorReceived.callCount, 4, 'Should have emitted four events only')
                    done()
                })
                .pipe(this.quarry)
        })
    })

    describe('receives appropriate level of console messages', () => {

        // When testing console log level filter out JS errors for convenience
        beforeEach(() => {
            this.filterEvents = (chunk) => {
                return typeof chunk.type === 'string'
            }
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
            delete this.options.consoleLevel
            this.filterEvents = () => { return true }
        })

        describe('with the console level set to \'error\'', () => {
            beforeEach(() => {
                this.options.consoleLevel = 'error'
                this.hunt = hounds.release(this.options)
            })

            it('detects the console error', done => {
                this.assertErrorReceived = (chunk, callCount) => {
                    if (callCount !== 1) return
                    assert.equal(chunk.url, this.options.url, 'URL is passed through')
                    assert.equal(chunk.type, 'error', 'Console event level is error')
                    assert.equal(chunk.message, 'error before load', 'Console error is reported correctly')
                    done()
                }

                this.hunt.on('error', done).pipe(this.quarry)
            })
        })

        describe('with the console level set to \'warn\'', () => {
            beforeEach(() => {
                this.options.consoleLevel = 'warn'
                this.hunt = hounds.release(this.options)
            })

            it('detects the error and the warning', done => {
                this.assertErrorReceived = (chunk, callCount) => {
                    assert.equal(chunk.url, this.options.url, 'URL is passed through')
                    if (callCount === 1) {
                        assert.equal(chunk.type, 'warn', 'Console event level is correct')
                        assert.equal(chunk.message, 'test', 'Console message is reported correctly')
                    } else if (callCount === 2) {
                        assert.equal(chunk.type, 'error', 'Console event level is correct')
                        assert.equal(chunk.message, 'error before load', 'Console message is reported correctly')
                        done()
                    } else {
                        done(new Error('Called too many times'))
                    }
                }

                this.hunt.on('error', done).pipe(this.quarry)
            })
        })

        describe('with the console level set to \'log\'', () => {
            beforeEach(() => {
                this.options.consoleLevel = 'log'
                this.hunt = hounds.release(this.options)
            })

            it('detects the error, the warning, and the log', done => {
                this.assertErrorReceived = (chunk, callCount) => {
                    assert.equal(chunk.url, this.options.url, 'URL is passed through')
                    if (callCount === 1) {
                        assert.equal(chunk.type, 'warn', 'Console event level is correct')
                        assert.equal(chunk.message, 'test', 'Console message is reported correctly')
                    } else if (callCount === 2) {
                        assert.equal(chunk.type, 'error', 'Console event level is correct')
                        assert.equal(chunk.message, 'error before load', 'Console message is reported correctly')
                    } else if (callCount === 3) {
                        assert.equal(chunk.type, 'log', 'Console event level is correct')
                        assert.equal(chunk.message, 'page loaded', 'Console message is reported correctly')
                        done()
                    } else {
                        done(new Error('Called too many times'))
                    }
                }

                this.hunt.on('error', done).pipe(this.quarry)
            })
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
                if (callCount !== 4) return
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
                        3,
                        'Expected only 1 extra page followed, so no more than 3 errors should resolve'
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

        describe('when waitAfterLoadedFor is set to 750ms and maxFollows is 0', () => {
            beforeEach(() => {
                this.options.maxFollows = 0
                this.options.waitAfterLoadedFor = 750
                this.hunt = hounds.release(this.options)
            })

            afterEach(() => {
                this.hunt.unpipe(this.quarry)
            })

            it('then it only returns the first four errors', done => {
                sinon.spy(this, 'assertErrorReceived')
                this.hunt
                    .on('error', done)
                    .on('end', () => {
                        assert.equal(this.assertErrorReceived.callCount, 4, 'Should have emitted four errors only')
                        done()
                    })
                    .pipe(this.quarry)
            })
        })
    })

    describe('when before provided', () => {
        let doBefore = () => {}
        beforeEach(() => {
            sinon.spy(this, 'assertErrorReceived')
            sinon.spy(this, 'assertLoggedTo')
            this.options.before = nightmare => {
                return doBefore(nightmare)
            }
            sinon.spy(this.options, 'before')
            this.hunt = hounds.release(this.options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
        })

        it('then it is invoked with the Nightmare instance', done => {
            doBefore = nightmare => {
                return nightmare.wait(300).then(() => {
                    assert.equal(this.assertErrorReceived.callCount, 0, 'Should not have emitted errors yet')
                    assert.equal(this.assertLoggedTo.callCount, 0, 'Should not have logged anything yet')
                }).catch(done)
            }
            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.equal(this.options.before.callCount, 1, 'Before must have been invoked')
                    done()
                })
                .pipe(this.quarry)
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

    describe('when screenshot function is provided', () => {
        let options
        let outpath
        let i = 0

        beforeEach(() => {
            outpath = path.join(__dirname, 'out')
            fs.ensureDirSync(outpath)
            options = Object.assign({
                screenshot: sinon.spy(() => path.join(outpath, `temp_img_${i++}.png`))
            }, this.options)
            this.hunt = hounds.release(options)
        })

        afterEach(() => {
            this.hunt.unpipe(this.quarry)
            fs.removeSync(outpath)
        })

        it('invokes the screenshot for each page', done => {
            this.hunt
                .on('error', done)
                .on('end', () => {
                    assert.equal(options.screenshot.callCount, 3, 'Screenshot must be called three times')
                    assert.ok(fs.existsSync(path.join(outpath, 'temp_img_0.png')), 'Screenshot #1 exists')
                    assert.ok(fs.existsSync(path.join(outpath, 'temp_img_1.png')), 'Screenshot #2 exists')
                    assert.ok(fs.existsSync(path.join(outpath, 'temp_img_2.png')), 'Screenshot #3 exists')
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
