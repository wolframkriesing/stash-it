import { expect } from 'chai';
import sinon from 'sinon';
import { nonObjectValues, nonStringValues, createDummyAdapter } from 'stash-it-test-helpers';

import { createCache } from '../../../../src/createCache';
import createItem from '../../../../src/createItem';

export default function getDataTests(getDataMethod, testSuitName, prefix) {
    describe(testSuitName, () => {
        let cacheInstance;
        let dummyAdapter;
        let anyValidArgs;

        beforeEach(() => {
            dummyAdapter = createDummyAdapter(createItem);
            cacheInstance = createCache(dummyAdapter);
            anyValidArgs = { cacheInstance };
        });

        context('when getDataMethod name is not passed as a string', () => {
            it('should throw', () => {
                nonStringValues.forEach((methodName) => {
                    expect(getDataMethod.bind(null, methodName)).to.throw("'methodName' must be a string.");
                });
            });
        });

        context('when args are not passed as an object', () => {
            it('should throw', () => {
                nonObjectValues.forEach((value) => {
                    expect(getDataMethod.bind(null, 'someMethodName', value)).to.throw("'args' must be an object.");
                });
            });
        });

        context(`when args don't contain cacheInstance`, () => {
            it('should throw', () => {
                expect(getDataMethod.bind(null, 'someMethodName', {}))
                    .to.throw("'args' must contain 'cacheInstance' property.");
            });
        });

        it('should return object with the same keys that args were passed with (as values can differ)', async () => {
            const data = await getDataMethod('someMethodName', anyValidArgs);
            const keys = Object.keys(data);
            const expectedKeys = [ 'cacheInstance' ];

            expect(keys).to.deep.eq(expectedKeys);
        });

        describe('returned cacheInstance', () => {
            it('should return reference to cacheInstance instance under cacheInstance property', async () => {
                const data = await getDataMethod('someMethodName', anyValidArgs);

                expect(data.cacheInstance).to.not.be.undefined;
            });

            it('should return reference to cacheInstance', async () => {
                const data = await getDataMethod('someMethodName', anyValidArgs);

                expect(data.cacheInstance === cacheInstance).to.be.true;
            });
        });

        context('when there is no hook for given event', () => {
            it('should return args in an exact form as they were passed in the first place', async () => {
                cacheInstance.addHook({ event: `${prefix}SomeOtherEventName`, handler: () => {} });

                const data = await getDataMethod('eventName', anyValidArgs);

                expect(data === anyValidArgs).to.be.true;
            });

            it('should not pass args through hooks that were registered for that event', async () => {
                const hook = { event: `${prefix}SomeOtherEventName`, handler: sinon.spy() };

                cacheInstance.addHook(hook);

                await getDataMethod('eventName', anyValidArgs);

                expect(hook.handler).to.not.have.been.called;
            });
        });

        context('when there is a hook for given event', () => {
            it(`should return args handled by that hook's handler (whatever it does)`, async () => {
                const identityStub = sinon.stub().returnsArg(0);

                cacheInstance.addHook({ event: `${prefix}EventName`, handler: identityStub });

                const data = await getDataMethod('eventName', anyValidArgs);

                expect(data).to.deep.equal(anyValidArgs);
                expect(identityStub).to.have.been.calledWith(anyValidArgs).to.have.been.calledOnce;
            });
        });

        describe('executing handlers', () => {
            context('for synchronous handlers', () => {
                it('should happen in sequence', async () => {
                    const hook1 = {
                        event: `${prefix}EventName`,
                        handler: sinon.spy()
                    };
                    const hook2 = {
                        event: `${prefix}EventName`,
                        handler: sinon.spy()
                    };

                    cacheInstance.addHooks([ hook1, hook2 ]);
                    await getDataMethod('eventName', anyValidArgs);

                    expect(hook1.handler).to.have.been.calledBefore(hook2.handler);
                });
            });

            context('for asynchronous handlers', () => {
                it('should happen in sequence', async () => {
                    const stallFor = async (time) => await new Promise(resolve => setTimeout(resolve, time));
                    const spyForSlowHandler = sinon.spy();
                    const hook1 = {
                        event: `${prefix}EventName`,
                        handler: async () => {
                            await stallFor(50);
                            spyForSlowHandler();
                        }
                    };
                    const hook2 = {
                        event: `${prefix}EventName`,
                        handler: sinon.spy()
                    };

                    cacheInstance.addHooks([ hook1, hook2 ]);
                    await getDataMethod('eventName', anyValidArgs);

                    expect(spyForSlowHandler).to.have.been.calledBefore(hook2.handler);
                });
            });
        });
    });
}
