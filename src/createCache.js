import {
    createExtensionsValidator,
    validateAdapter,
    validateArgs,
    validateCreateExtensionsMethod,
    validateExtra,
    validateHook,
    validateHooks,
    validateMethodName,
    validateNamespace,
    validatePlugins
} from './validation';
import requiredMethods from './requiredMethods';

function upperFirst(string) {
    const firstLetter = string[0];
    const restOfTheString = string.substr(1);

    return `${firstLetter.toUpperCase()}${restOfTheString}`;
}

function passDataThroughHooks(hooks, event, args) {
    return Array.isArray(hooks[event])
        ? hooks[event].reduce((prev, next, index) => hooks[event][index](prev), args)
        : args;
}

export const getPreData = (methodName, args) => {
    validateMethodName(methodName);
    validateArgs(args);

    const hooks = args.cacheInstance.getHooks();
    const event = `pre${upperFirst(methodName)}`;

    return passDataThroughHooks(hooks, event, args);
};

export const getPostData = (methodName, args) => {
    validateMethodName(methodName);
    validateArgs(args);

    const hooks = args.cacheInstance.getHooks();
    const event = `post${upperFirst(methodName)}`;

    return passDataThroughHooks(hooks, event, args);
};

export function createCache(adapter, namespace) {
    validateAdapter(adapter, requiredMethods);
    validateNamespace(namespace);

    const hooks = {};

    return {
        addHook(hook) {
            validateHook(hook);

            const { event, handler } = hook;

            hooks[event] ? hooks[event].push(handler) : (hooks[event] = [handler]);
        },

        addHooks(hooks) {
            validateHooks(hooks);

            hooks.forEach(this.addHook);
        },

        getHooks() {
            return hooks;
        },

        getNamespace() {
            return namespace;
        },

        buildKey(key) {
            const preData = getPreData('buildKey', { cacheInstance: this, key });
            const builtKey = adapter.buildKey(preData.key);
            const postData = getPostData('buildKey', { cacheInstance: preData.cacheInstance, key: builtKey });

            return postData.key;
        },

        getItem(key) {
            const preData = getPreData('getItem', { cacheInstance: this, key });
            const item = adapter.getItem(this.buildKey(preData.key));
            const postData = getPostData('getItem', { cacheInstance: preData.cacheInstance, key: preData.key, item });

            return postData.item;
        },

        getExtra(key) {
            const preData = getPreData('getExtra', { cacheInstance: this, key });
            const extra = adapter.getExtra(this.buildKey(preData.key));
            const postData = getPostData('getExtra', { cacheInstance: preData.cacheInstance, key: preData.key, extra });

            return postData.extra;
        },

        setItem(key, value, extra = {}) {
            const preData = getPreData('setItem', { cacheInstance: this, key, value, extra });
            const item = adapter.setItem(this.buildKey(preData.key), preData.value, preData.extra);
            const postData = getPostData('setItem', {
                cacheInstance: preData.cacheInstance,
                key: preData.key,
                value: preData.value,
                extra: preData.extra,
                item
            });

            return postData.item;
        },

        addExtra(key, extra) {
            const preData = getPreData('addExtra', { cacheInstance: this, key, extra });

            validateExtra(preData.extra);

            const addedExtra =
                this.hasItem(preData.key)
                    ? adapter.addExtra(this.buildKey(preData.key), preData.extra)
                    : undefined;
            const postData = getPostData('addExtra', {
                cacheInstance: preData.cacheInstance, key: preData.key, extra: addedExtra });

            return postData.extra;
        },

        setExtra(key, extra) {
            const preData = getPreData('setExtra', { cacheInstance: this, key, extra });

            validateExtra(preData.extra);

            const setExtra =
                this.hasItem(preData.key)
                    ? adapter.setExtra(this.buildKey(preData.key), preData.extra)
                    : undefined;
            const postData = getPostData('setExtra', {
                cacheInstance: preData.cacheInstance, key: preData.key, extra: setExtra });

            return postData.extra;
        },

        hasItem(key) {
            const preData = getPreData('hasItem', { cacheInstance: this, key });
            const result = adapter.hasItem(this.buildKey(preData.key));
            const postData = getPostData('hasItem', { cacheInstance: preData.cacheInstance, key: preData.key, result });

            return postData.result;
        },

        removeItem(key) {
            const preData = getPreData('removeItem', { cacheInstance: this, key });
            const result = adapter.removeItem(this.buildKey(preData.key));
            const postData = getPostData('removeItem', {
                cacheInstance: preData.cacheInstance,
                key: preData.key,
                result
            });

            return postData.result;
        },

        registerPlugins(plugins) {
            validatePlugins(plugins);

            plugins.forEach(({ hooks }) => {
                hooks ? this.addHooks(hooks) : null;
            });

            return plugins.reduce((instance, plugin) => {
                if (plugin.createExtensions) {
                    validateCreateExtensionsMethod(plugin.createExtensions);

                    const extensionsFromPlugin = plugin.createExtensions(instance);
                    const extensionsValidator = createExtensionsValidator(instance);

                    extensionsValidator(extensionsFromPlugin);

                    return Object.assign({}, instance, extensionsFromPlugin);
                }

                return instance;
            }, this);
        }
    };
}
