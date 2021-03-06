import sinon from 'sinon';
import { expect } from 'chai';
import { createDummyAdapter, nonArrayValues, nonFunctionValues } from 'stash-it-test-helpers';

import createItem from '../../../../src/createItem';
import { createCache, getPreData, getPostData } from '../../../../src/createCache';

describe('registerPlugins', () => {
    const methods = {
        foo: sinon.spy(),
        bar: sinon.spy()
    };
    const createExtensionsStub = sinon.stub().returns(methods);
    const preSomeActionEventHandler = () => {};
    const pluginWithExtensionsAndHooks = {
        createExtensions: createExtensionsStub,
        hooks: [
            {
                event: 'preSomeAction',
                handler: preSomeActionEventHandler
            }
        ]
    };

    const methods2 = {
        bam: sinon.spy(),
        baz: sinon.spy()
    };
    const pluginWithExtensionsOnly = {
        createExtensions: () => methods2
    };

    const postSomeActionEventHandler = () => {};
    const pluginWithHooksOnly = {
        hooks: [
            {
                event: 'postSomeAction',
                handler: postSomeActionEventHandler
            }
        ]
    };

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
        const cacheWithPlugin = cache.registerPlugins([ pluginWithExtensionsAndHooks ]);

        const expectedRegisteredHooks = {
            preSomeAction: [ preSomeActionEventHandler ]
        };

        expect(cacheWithPlugin.getHooks()).to.deep.equal(expectedRegisteredHooks);
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

    it('should call createExtensions with cache instance, getPreData and getPostData as argument', () => {
        cache.registerPlugins([ pluginWithExtensionsAndHooks ]);

        expect(pluginWithExtensionsAndHooks.createExtensions)
            .to.have.been.calledWithExactly({ cacheInstance: cache, getPreData, getPostData })
            .to.have.been.calledOnce;
    });

    it('should return cache object extended by methods from plugins', () => {
        const cacheWithPlugins = cache.registerPlugins([ pluginWithExtensionsAndHooks, pluginWithExtensionsOnly ]);

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
        const cacheWithPlugins = cache.registerPlugins([ pluginWithExtensionsAndHooks ]);

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
            const cacheWithPlugin = cache.registerPlugins([ pluginWithExtensionsAndHooks ]);

            expect(cacheWithPlugin.registerPlugins.bind(cacheWithPlugin, [ pluginWithExtensionsAndHooks ]))
                .to.throw("Extension 'foo' already exists.");
        });
    });

    context('when plugins that contain methods of the same name are registered', () => {
        it('should throw', () => {
            expect(cache.registerPlugins.bind(cache, [ pluginWithExtensionsAndHooks, pluginWithExtensionsAndHooks ]))
                .to.throw("Extension 'foo' already exists.");
        });
    });

    describe('hooks inheritance', () => {
        context('when different hooks are registered using registerPlugins method', () => {
            it('should add hooks only to returned cache object, not the original one', () => {
                const hooksFromInitialCache = cache.getHooks();

                const cacheWithFirstPlugin = cache.registerPlugins([ pluginWithHooksOnly ]);
                const hooksFromCacheWithFirstPlugin = cacheWithFirstPlugin.getHooks();

                const cacheWithFirstAndSecondPlugin = cacheWithFirstPlugin.registerPlugins([ pluginWithExtensionsAndHooks ]);
                const hooksFromCacheWithBothPlugins = cacheWithFirstAndSecondPlugin.getHooks();

                expect(hooksFromInitialCache).to.not.deep.equal(hooksFromCacheWithFirstPlugin);
                expect(hooksFromCacheWithFirstPlugin).to.not.deep.equal(hooksFromCacheWithBothPlugins);
                expect(hooksFromInitialCache).to.not.deep.equal(hooksFromCacheWithBothPlugins);
            });
        });

        context('when the same hooks are registered using registerPlugins method', () => {
            it('should add hooks only to returned cache object, not the original one', () => {
                const hooksFromInitialCache = cache.getHooks();

                const cacheWithFirstPlugin = cache.registerPlugins([ pluginWithHooksOnly ]);
                const hooksFromCacheWithFirstPlugin = cacheWithFirstPlugin.getHooks();

                const cacheWithFirstAndSecondPlugin = cacheWithFirstPlugin.registerPlugins([ pluginWithHooksOnly ]);
                const hooksFromCacheWithBothPlugins = cacheWithFirstAndSecondPlugin.getHooks();

                expect(hooksFromInitialCache).to.not.deep.equal(hooksFromCacheWithFirstPlugin);
                expect(hooksFromCacheWithFirstPlugin).to.not.deep.equal(hooksFromCacheWithBothPlugins);
                expect(hooksFromInitialCache).to.not.deep.equal(hooksFromCacheWithBothPlugins);
            });
        });
    });
});
