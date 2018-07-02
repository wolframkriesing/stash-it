import sinon from 'sinon';
import { expect } from 'chai';
import { FOO_KEY, FOO_VALUE, createDummyAdapter } from 'stash-it-test-helpers';

import createItem from '../../../../src/createItem';
import { createCache } from '../../../../src/createCache';

describe('getItem method', () => {
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
        cache.getItem(FOO_KEY);

        expect(dummyAdapter.buildKey)
            .to.have.been.calledWith(FOO_KEY)
            .to.have.been.calledOnce;
    });

    it(`should get item using adapter's getItem method`, () => {
        const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
        const expectedItem = createItem(adapterBuiltKey, FOO_VALUE);
        const item = cache.getItem(FOO_KEY);

        expect(item).to.deep.eq(expectedItem);
        expect(dummyAdapter.getItem)
            .to.have.been.calledWith(adapterBuiltKey)
            .to.have.been.calledOnce;
    });

    context('when there are hooks for pre/post events', () => {
        beforeEach(() => {
            cache.addHooks([
                {
                    event: 'preGetItem',
                    handler: preStub
                },
                {
                    event: 'postGetItem',
                    handler: postStub
                }
            ]);
        });

        it(`should pass data through that hook's handlers`, () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const item = createItem(adapterBuiltKey, FOO_VALUE);
            const expectedPreArgs = {
                cacheInstance: cache,
                key: FOO_KEY
            };
            const expectedPostArgs = {
                cacheInstance: cache,
                item,
                key: FOO_KEY
            };

            cache.getItem(FOO_KEY);

            expect(preStub)
                .to.have.been.calledWith(expectedPreArgs)
                .to.have.been.calledOnce;

            expect(postStub)
                .to.have.been.calledWith(expectedPostArgs)
                .to.have.been.calledOnce;
        });

        it('should call getPreData, getItem, getPostData in correct sequence', () => {
            cache.getItem(FOO_KEY);

            expect(preStub).to.have.been.calledOnce;
            expect(dummyAdapter.getItem)
                .to.have.been.calledAfter(preStub)
                .to.have.been.calledOnce;
            expect(postStub)
                .to.have.been.calledAfter(dummyAdapter.getItem)
                .to.have.been.calledOnce;
        });
    });

    context('when there are no hooks for pre/post events', () => {
        it('should get item without passing data through pre/post event handlers', () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);
            const expectedItem = createItem(adapterBuiltKey, FOO_VALUE);
            const item = cache.getItem(FOO_KEY);

            expect(preStub).to.not.have.been.called;
            expect(postStub).to.not.have.been.called;

            expect(item).to.deep.eq(expectedItem);
        });

        it(`should get item using adapter's getItem method`, () => {
            const adapterBuiltKey = dummyAdapter.buildKey(FOO_KEY);

            cache.getItem(FOO_KEY);

            expect(dummyAdapter.getItem)
                .to.have.been.calledWith(adapterBuiltKey)
                .to.have.been.calledOnce;
        });
    });
});
