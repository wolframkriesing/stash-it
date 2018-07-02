import { expect } from 'chai';
import sinon from 'sinon';
import R from 'ramda';
import {
    createDummyAdapter,
    FOO_KEY,
    FOO_EXTRA,
    NONEXISTENT_KEY,
    nonArrayValues,
    nonFunctionValues,
    nonObjectValues
} from 'stash-it-test-helpers';

import createItem from '../../../src/createItem';
import { createCache } from '../../../src/createCache';
import requiredMethods from '../../../src/requiredMethods';

describe('createCache', () => {
    const expectedMethods = [
        'addExtra',
        'addHook',
        'addHooks',
        'buildKey',
        'getExtra',
        'getHooks',
        'getItem',
        'hasItem',
        'removeItem',
        'setItem',
        'setExtra',
        'registerPlugins'
    ];

    let cache;
    let dummyAdapter;

    beforeEach(() => {
        dummyAdapter = createDummyAdapter(createItem);
        cache = createCache(dummyAdapter);
    });

    it('should create cache object', () => {
        expect(cache).to.be.ok;
    });

    it('should create cache object with all methods', () => {
        expect(cache).to.have.all.keys(expectedMethods);
    });

    context('when adapter is not an object', () => {
        it('should throw', () => {
            nonObjectValues.forEach((adapterDouble) => {
                expect(createCache.bind(null, adapterDouble)).to.throw("'adapter' must be an object.");
            });
        });
    });

    context('when not all required methods are present', () => {
        it('should throw', () => {
            requiredMethods.forEach((methodName, index) => {
                const allMethodsButOne = R.remove(index, 1, requiredMethods);
                const adapterDouble = {};

                allMethodsButOne.forEach((methodName) => {
                    adapterDouble[methodName] = '';
                });

                expect(createCache.bind(null, adapterDouble)).to.throw('Not all required methods are present in adapter.');
            });
        });
    });

    context('when not all required methods are functions', () => {
        it('should throw', () => {
            requiredMethods.forEach((methodName, index) => {
                const allMethodsButOne = R.remove(index, 1, requiredMethods);
                const adapterDouble = {
                    [methodName]: ''
                };

                allMethodsButOne.forEach((methodName) => {
                    adapterDouble[methodName] = () => {};
                });

                expect(createCache.bind(null, adapterDouble)).to.throw('Not all required methods are functions.');
            });
        });
    });

    describe('setExtra method', () => {
        const preStub = sinon.stub().returnsArg(0);
        const postStub = sinon.stub().returnsArg(0);

        beforeEach(() => {
            preStub.resetHistory();
            postStub.resetHistory();
        });

        it('should check if item exists', () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

            cache.setExtra(FOO_KEY, FOO_EXTRA);

            expect(dummyAdapter.hasItem)
                .to.have.been.calledWith(adapterBuiltKey)
                .to.have.been.calledOnce;
        });

        it(`should build key using adapter's buildKey method`, () => {
            cache.setExtra(FOO_KEY, FOO_EXTRA);

            expect(dummyAdapter.buildKey)
                .to.have.been.calledWith(FOO_KEY)
                .to.have.been.calledTwice;
        });

        it(`should set extra using adapter's setExtra method`, () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const setExtra = cache.setExtra(FOO_KEY, FOO_EXTRA);

            expect(setExtra).to.deep.eq(FOO_EXTRA);
            expect(dummyAdapter.setExtra)
                .to.have.been.calledWith(adapterBuiltKey, FOO_EXTRA)
                .to.have.been.calledOnce;
        });

        describe('extra validation', () => {
            beforeEach(() => {
                cache.addHooks([
                    {
                        event: 'preSetExtra',
                        handler: preStub
                    },
                    {
                        event: 'postSetExtra',
                        handler: postStub
                    }
                ]);
            });

            it('should happen after getPreData', () => {
                try {
                    cache.setExtra(FOO_KEY, null);
                }
                catch (e) {
                    expect(preStub).to.have.been.calledOnce;
                }
            });

            it(`should happen before using adapter's setExtra method`, () => {
                try {
                    cache.setExtra(FOO_KEY, null);
                }
                catch (e) {
                    expect(dummyAdapter.setExtra).to.not.have.been.called;
                }
            });

            it('should happen before getPostData', () => {
                try {
                    cache.setExtra(FOO_KEY, null);
                }
                catch (e) {
                    expect(postStub).to.not.have.been.called;
                }
            });

            context('when extra is not an object', () => {
                it('should throw', () => {
                    nonObjectValues.forEach((extra) => {
                        expect(cache.setExtra.bind(cache, FOO_KEY, extra)).to.throw("'extra' must be an object.");
                    });
                });
            });
        });

        context('when item does not exist', () => {
            it('should return undefined', () => {
                const setExtra = cache.setExtra(NONEXISTENT_KEY, FOO_EXTRA);

                expect(setExtra).to.be.undefined;
            });
        });

        context('when there are hooks for pre/post events', () => {
            beforeEach(() => {
                cache.addHooks([
                    {
                        event: 'preSetExtra',
                        handler: preStub
                    },
                    {
                        event: 'postSetExtra',
                        handler: postStub
                    }
                ]);
            });

            it(`should pass data through that hook's handlers`, () => {
                const expectedPreArgs = {
                    cacheInstance: cache,
                    extra: FOO_EXTRA,
                    key: FOO_KEY
                };
                const expectedPostArgs = {
                    cacheInstance: cache,
                    extra: FOO_EXTRA,
                    key: FOO_KEY
                };

                cache.setExtra(FOO_KEY, FOO_EXTRA);

                expect(preStub)
                    .to.have.been.calledWith(expectedPreArgs)
                    .to.have.been.calledOnce;

                expect(postStub)
                    .to.have.been.calledWith(expectedPostArgs)
                    .to.have.been.calledOnce;
            });

            it('should call getPreData, setExtra, getPostData in correct sequence', () => {
                cache.setExtra(FOO_KEY, FOO_EXTRA);

                expect(preStub).to.have.been.calledOnce;
                expect(dummyAdapter.setExtra)
                    .to.have.been.calledAfter(preStub)
                    .to.have.been.calledOnce;
                expect(postStub)
                    .to.have.been.calledAfter(dummyAdapter.setExtra)
                    .to.have.been.calledOnce;
            });
        });

        context('when there are no hooks for pre/post events', () => {
            it('should set extra without passing data through pre/post event handlers', () => {
                const setExtra = cache.setExtra(FOO_KEY, FOO_EXTRA);

                expect(preStub).to.not.have.been.called;
                expect(postStub).to.not.have.been.called;

                expect(setExtra).to.deep.eq(FOO_EXTRA);
            });

            it(`should set extra using adapter's setExtra method`, () => {
                const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

                cache.setExtra(FOO_KEY, FOO_EXTRA);

                expect(dummyAdapter.setExtra)
                    .to.have.been.calledWith(adapterBuiltKey, FOO_EXTRA)
                    .to.have.been.calledOnce;
            });
        });
    });

    describe('addExtra method', () => {
        const preStub = sinon.stub().returnsArg(0);
        const postStub = sinon.stub().returnsArg(0);

        beforeEach(() => {
            preStub.resetHistory();
            postStub.resetHistory();
        });

        it('should check if item exists', () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

            cache.addExtra(FOO_KEY, FOO_EXTRA);

            expect(dummyAdapter.hasItem)
                .to.have.been.calledWith(adapterBuiltKey)
                .to.have.been.calledOnce;
        });

        it(`should build key using adapter's buildKey method`, () => {
            cache.addExtra(FOO_KEY, FOO_EXTRA);

            expect(dummyAdapter.buildKey)
                .to.have.been.calledWith(FOO_KEY)
                .to.have.been.calledTwice;
        });

        it(`should add extra using adapter's addExtra method`, () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const addedExtra = cache.addExtra(FOO_KEY, FOO_EXTRA);

            expect(addedExtra).to.deep.eq(FOO_EXTRA);
            expect(dummyAdapter.addExtra)
                .to.have.been.calledWith(adapterBuiltKey, FOO_EXTRA)
                .to.have.been.calledOnce;
        });

        describe('extra validation', () => {
            beforeEach(() => {
                cache.addHooks([
                    {
                        event: 'preAddExtra',
                        handler: preStub
                    },
                    {
                        event: 'postAddExtra',
                        handler: postStub
                    }
                ]);
            });

            it('should happen after getPreData', () => {
                try {
                    cache.addExtra(FOO_KEY, null);
                }
                catch (e) {
                    expect(preStub).to.have.been.calledOnce;
                }
            });

            it(`should happen before using adapter's addExtra method`, () => {
                try {
                    cache.addExtra(FOO_KEY, null);
                }
                catch (e) {
                    expect(dummyAdapter.addExtra).to.not.have.been.called;
                }
            });

            it('should happen before getPostData', () => {
                try {
                    cache.addExtra(FOO_KEY, null);
                }
                catch (e) {
                    expect(postStub).to.not.have.been.called;
                }
            });

            context('when extra is not an object', () => {
                it('should throw', () => {
                    nonObjectValues.forEach((extra) => {
                        expect(cache.addExtra.bind(cache, FOO_KEY, extra)).to.throw("'extra' must be an object.");
                    });
                });
            });
        });

        context('when item does not exist', () => {
            it('should return undefined', () => {
                const addedExtra = cache.addExtra(NONEXISTENT_KEY, FOO_EXTRA);

                expect(addedExtra).to.be.undefined;
            });
        });

        context('when there are hooks for pre/post events', () => {
            beforeEach(() => {
                cache.addHooks([
                    {
                        event: 'preAddExtra',
                        handler: preStub
                    },
                    {
                        event: 'postAddExtra',
                        handler: postStub
                    }
                ]);
            });

            it(`should pass data through that hook's handlers`, () => {
                const expectedPreArgs = {
                    cacheInstance: cache,
                    extra: FOO_EXTRA,
                    key: FOO_KEY
                };
                const expectedPostArgs = {
                    cacheInstance: cache,
                    extra: FOO_EXTRA,
                    key: FOO_KEY
                };

                cache.addExtra(FOO_KEY, FOO_EXTRA);

                expect(preStub)
                    .to.have.been.calledWith(expectedPreArgs)
                    .to.have.been.calledOnce;

                expect(postStub)
                    .to.have.been.calledWith(expectedPostArgs)
                    .to.have.been.calledOnce;
            });

            it('should call getPreData, addExtra, getPostData in correct sequence', () => {
                cache.addExtra(FOO_KEY, FOO_EXTRA);

                expect(preStub).to.have.been.calledOnce;
                expect(dummyAdapter.addExtra)
                    .to.have.been.calledAfter(preStub)
                    .to.have.been.calledOnce;
                expect(postStub)
                    .to.have.been.calledAfter(dummyAdapter.addExtra)
                    .to.have.been.calledOnce;
            });
        });

        context('when there are no hooks for pre/post events', () => {
            it('should set extra without passing data through pre/post event handlers', () => {
                const addedExtra = cache.addExtra(FOO_KEY, FOO_EXTRA);

                expect(preStub).to.not.have.been.called;
                expect(postStub).to.not.have.been.called;

                expect(addedExtra).to.deep.eq(FOO_EXTRA);
            });

            it(`should set extra using adapter's addExtra method`, () => {
                const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

                cache.addExtra(FOO_KEY, FOO_EXTRA);

                expect(dummyAdapter.addExtra)
                    .to.have.been.calledWith(adapterBuiltKey, FOO_EXTRA)
                    .to.have.been.calledOnce;
            });
        });
    });

    describe('hasItem method', () => {
        const preStub = sinon.stub().returnsArg(0);
        const postStub = sinon.stub().returnsArg(0);

        beforeEach(() => {
            preStub.resetHistory();
            postStub.resetHistory();
        });

        it(`should build key using adapter's buildKey method`, () => {
            cache.hasItem(FOO_KEY);

            expect(dummyAdapter.buildKey)
                .to.have.been.calledWith(FOO_KEY)
                .to.have.been.calledOnce;
        });

        it(`should check item's existence using adapter's hasItem method`, () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const result = cache.hasItem(FOO_KEY);

            expect(result).to.be.true;
            expect(dummyAdapter.hasItem)
                .to.have.been.calledWith(adapterBuiltKey)
                .to.have.been.calledOnce;
        });

        context('when there are hooks for pre/post events', () => {
            beforeEach(() => {
                cache.addHooks([
                    {
                        event: 'preHasItem',
                        handler: preStub
                    },
                    {
                        event: 'postHasItem',
                        handler: postStub
                    }
                ]);
            });

            it(`should pass data through that hook's handlers`, () => {
                const expectedPreArgs = {
                    cacheInstance: cache,
                    key: FOO_KEY
                };
                const expectedPostArgs = {
                    cacheInstance: cache,
                    key: FOO_KEY,
                    result: true
                };

                cache.hasItem(FOO_KEY);

                expect(preStub)
                    .to.have.been.calledWith(expectedPreArgs)
                    .to.have.been.calledOnce;

                expect(postStub)
                    .to.have.been.calledWith(expectedPostArgs)
                    .to.have.been.calledOnce;
            });

            it('should call getPreData, hasItem, getPostData in correct sequence', () => {
                cache.hasItem(FOO_KEY);

                expect(preStub).to.have.been.calledOnce;
                expect(dummyAdapter.hasItem)
                    .to.have.been.calledAfter(preStub)
                    .to.have.been.calledOnce;
                expect(postStub)
                    .to.have.been.calledAfter(dummyAdapter.hasItem)
                    .to.have.been.calledOnce;
            });
        });

        context('when there are no hooks for pre/post events', () => {
            it(`should check item's existence without passing data through pre/post event handlers`, () => {
                const result = cache.hasItem(FOO_KEY);

                expect(preStub).to.not.have.been.called;
                expect(postStub).to.not.have.been.called;

                expect(result).to.be.true;
            });

            it(`should check item's existence using adapter's hasItem method`, () => {
                const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

                cache.hasItem(FOO_KEY);

                expect(dummyAdapter.hasItem)
                    .to.have.been.calledWith(adapterBuiltKey)
                    .to.have.been.calledOnce;
            });
        });
    });

    describe('removeItem method', () => {
        const preStub = sinon.stub().returnsArg(0);
        const postStub = sinon.stub().returnsArg(0);

        beforeEach(() => {
            preStub.resetHistory();
            postStub.resetHistory();
        });

        it(`should build key using adapter's buildKey method`, () => {
            cache.removeItem(FOO_KEY);

            expect(dummyAdapter.buildKey)
                .to.have.been.calledWith(FOO_KEY)
                .to.have.been.calledOnce;
        });

        it(`should remove item using adapter's removeItem method`, () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const result = cache.removeItem(FOO_KEY);

            expect(result).to.be.true;
            expect(dummyAdapter.removeItem)
                .to.have.been.calledWith(adapterBuiltKey)
                .to.have.been.calledOnce;
        });

        context('when there are hooks for pre/post events', () => {
            beforeEach(() => {
                cache.addHooks([
                    {
                        event: 'preRemoveItem',
                        handler: preStub
                    },
                    {
                        event: 'postRemoveItem',
                        handler: postStub
                    }
                ]);
            });

            it(`should pass data through that hook's handlers`, () => {
                const expectedPreArgs = {
                    cacheInstance: cache,
                    key: FOO_KEY
                };
                const expectedPostArgs = {
                    cacheInstance: cache,
                    key: FOO_KEY,
                    result: true
                };

                cache.removeItem(FOO_KEY);

                expect(preStub)
                    .to.have.been.calledWith(expectedPreArgs)
                    .to.have.been.calledOnce;

                expect(postStub)
                    .to.have.been.calledWith(expectedPostArgs)
                    .to.have.been.calledOnce;
            });

            it('should call getPreData, removeItem, getPostData in correct sequence', () => {
                cache.removeItem(FOO_KEY);

                expect(preStub).to.have.been.calledOnce;
                expect(dummyAdapter.removeItem)
                    .to.have.been.calledAfter(preStub)
                    .to.have.been.calledOnce;
                expect(postStub)
                    .to.have.been.calledAfter(dummyAdapter.removeItem)
                    .to.have.been.calledOnce;
            });
        });

        context('when there are no hooks for pre/post events', () => {
            it('should remove item without passing data through pre/post event handlers', () => {
                const result = cache.removeItem(FOO_KEY);

                expect(preStub).to.not.have.been.called;
                expect(postStub).to.not.have.been.called;

                expect(result).to.be.true;
            });

            it(`should remove item using adapter's removeItem method`, () => {
                const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

                cache.removeItem(FOO_KEY);

                expect(dummyAdapter.removeItem)
                    .to.have.been.calledWith(adapterBuiltKey)
                    .to.have.been.calledOnce;
            });
        });
    });

    describe('registerPlugins', () => {
        const methods = {
            foo: sinon.spy(),
            bar: sinon.spy()
        };
        const createExtensionsStub = sinon.stub().returns(methods);
        const preSomeActionEventHandler = () => {};
        const plugin = {
            createExtensions: createExtensionsStub,
            hooks: [
                {
                    event: 'preSomeAction',
                    handler: preSomeActionEventHandler
                }
            ]
        };

        beforeEach(() => {
            createExtensionsStub.resetHistory();
        });

        context('when plugins are not passed as an array', () => {
            it('should throw', () => {
                nonArrayValues.forEach((value) => {
                    expect(cache.registerPlugins.bind(null, value))
                        .to.throw("'plugins' need to be passed as an array.");
                });
            });
        });

        context('when there are no hooks and getExtension', () => {
            it('should throw', () => {
                const notAPlugin = {};

                expect(cache.registerPlugins.bind(null, [ notAPlugin ]))
                    .to.throw('Plugin must contain hooks or createExtensions method or both.');
            });
        });

        it('should add hooks to cache instance', () => {
            cache.registerPlugins([ plugin ]);

            const expectedRegisteredHooks = {
                preSomeAction: [ preSomeActionEventHandler ]
            };

            expect(cache.getHooks()).to.deep.equal(expectedRegisteredHooks);
        });

        context(`when plugin's createExtensions property is not present`, () => {
            it('should return unchanged cache instance', () => {
                const pluginWithHooksOnly = { hooks: [] };
                const cacheWithPlugins = cache.registerPlugins([ pluginWithHooksOnly ]);

                expect(cacheWithPlugins).to.equal(cache);
            });
        });

        context(`when plugin's createExtensions property is not a function`, () => {
            it('should throw', () => {
                const nonNilValues = nonFunctionValues.filter((value) => {
                    const result = [ null, undefined, false, 0 ].includes(value);

                    return !result;
                });

                nonNilValues.forEach((value) => {
                    const customPlugin = {
                        createExtensions: value,
                        hooks: []
                    };

                    expect(cache.registerPlugins.bind(cache, [ customPlugin ]))
                        .to.throw("'createExtensions' must be a function.");
                });
            });
        });

        it('should return cache object extended by methods from plugins', () => {
            const methods2 = {
                bam: sinon.spy(),
                baz: sinon.spy()
            };
            const plugin2 = {
                createExtensions: () => methods2
            };

            const cacheWithPlugins = cache.registerPlugins([ plugin, plugin2 ]);

            expect(cacheWithPlugins).to.have.property('foo');
            expect(cacheWithPlugins).to.have.property('bar');
            expect(cacheWithPlugins).to.have.property('baz');
            expect(cacheWithPlugins).to.have.property('bam');

            cacheWithPlugins.foo();
            cacheWithPlugins.bar();
            cacheWithPlugins.baz();
            cacheWithPlugins.bam();

            expect(methods.foo).to.have.been.calledOnce;
            expect(methods.bar).to.have.been.calledOnce;
            expect(methods2.baz).to.have.been.calledOnce;
            expect(methods2.bam).to.have.been.calledOnce;
        });

        it('should return freezed cache object', () => {
            const cacheWithPlugins = cache.registerPlugins([ plugin ]);

            expectedMethods.forEach((methodName) => {
                try {
                    delete cacheWithPlugins[methodName];
                } catch(e) {}

                expect(cacheWithPlugins[methodName]).to.be.ok;
            });
        });

        context(`when plugin doesn't extend cache instance with new methods`, () => {
            it('should return freezed cache object', () => {
                const pluginWithHooksOnly = { hooks: [] };
                const cacheWithPlugins = cache.registerPlugins([ pluginWithHooksOnly ]);

                expectedMethods.forEach((methodName) => {
                    try {
                        delete cacheWithPlugins[methodName];
                    } catch(e) {}

                    expect(cacheWithPlugins[methodName]).to.be.ok;
                });
            });
        });

        context('when method from plugin already exists in cache', () => {
            it('should throw', () => {
                const cacheWithPlugin = cache.registerPlugins([ plugin ]);

                expect(cacheWithPlugin.registerPlugins.bind(cacheWithPlugin, [ plugin ]))
                    .to.throw("Extension 'foo' already exists.");
            });
        });

        context('when plugins that contain methods of the same name are registered', () => {
            it('should throw', () => {
                expect(cache.registerPlugins.bind(cache, [ plugin, plugin ]))
                    .to.throw("Extension 'foo' already exists.");
            });
        });
    });
});
