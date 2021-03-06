import sinon from 'sinon';
import { expect } from 'chai';
import { createDummyAdapter, FOO_KEY } from 'stash-it-test-helpers';

import createItem from '../../../../src/createItem';
import { createCache } from '../../../../src/createCache';

describe('buildKey method', () => {
    const preStub = sinon.stub().returnsArg(0);
    const postStub = sinon.stub().returnsArg(0);

    let cache;
    let dummyAdapter;

    beforeEach(() => {
        dummyAdapter = createDummyAdapter(createItem);
        cache = createCache(dummyAdapter);

        preStub.resetHistory();
        postStub.resetHistory();
    });

    it(`should build key using adapter's buildKey method`, () => {
        const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

        dummyAdapter.buildKey.resetHistory();

        const key = cache.buildKey(FOO_KEY);

        expect(key).to.eq(adapterBuiltKey);
        expect(dummyAdapter.buildKey)
            .to.have.been.calledWith(FOO_KEY)
            .to.have.been.calledOnce;
    });

    context('when there are hooks for pre/post events', () => {
        beforeEach(() => {
            cache.addHooks([
                {
                    event: 'preBuildKey',
                    handler: preStub
                },
                {
                    event: 'postBuildKey',
                    handler: postStub
                }
            ]);
        });

        it(`should pass data through that hook's handlers`, () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const expectedPreArgs = {
                cacheInstance: cache,
                key: FOO_KEY
            };
            const expectedPostArgs = {
                cacheInstance: cache,
                key: adapterBuiltKey
            };

            cache.buildKey(FOO_KEY);

            expect(preStub)
                .to.have.been.calledWith(expectedPreArgs)
                .to.have.been.calledOnce;

            expect(postStub)
                .to.have.been.calledWith(expectedPostArgs)
                .to.have.been.calledOnce;
        });

        it('should call getPreData, buildKey, getPostData in correct sequence', () => {
            cache.buildKey(FOO_KEY);

            expect(preStub).to.have.been.calledOnce;
            expect(dummyAdapter.buildKey)
                .to.have.been.calledAfter(preStub)
                .to.have.been.calledOnce;
            expect(postStub)
                .to.have.been.calledAfter(dummyAdapter.buildKey)
                .to.have.been.calledOnce;
        });
    });

    context('when there are no hooks for pre/post events', () => {
        it('should build key without passing data through pre/post event handlers', () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const key = cache.buildKey(FOO_KEY);

            expect(preStub).to.not.have.been.called;
            expect(postStub).to.not.have.been.called;

            expect(key).to.eq(adapterBuiltKey);
        });

        it(`should build key using adapter's buildKey method`, () => {
            cache.buildKey(FOO_KEY);

            expect(dummyAdapter.buildKey)
                .to.have.been.calledWith(FOO_KEY)
                .to.have.been.calledOnce;
        });
    });
});
