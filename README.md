# stash-it
Cache mechanism based on plugins.

## Installation

```sh
npm i stash-it --save
```

## Usage

### createCache(adapter)

```javascript
import { createCache } from 'stash-it';
import createMemoryAdapter from 'stash-it-adapter-memory'; // use any adapter that works with stash-it

const adapter = createMemoryAdapter({ namespace: 'some-namespace' });
const cache = createCache(adapter);

cache.setItem('key', 'value');

cache.hasItem('key'); // true
```

### registerPlugins(cacheInstance, plugins)

```javascript
import { createCache, registerPlugins } from 'stash-it';
import createMemoryAdapter from 'stash-it-adapter-memory'; // use any adapter that works with stash-it
import createDebugPlugin from 'stash-it-plugin-debug'; // use any plugin that works with stash-it

const adapter = createMemoryAdapter({ namespace: 'some-namespace' });
const debugPlugin = createDebugPlugin(console.log);

const cache = createCache(adapter);
const cacheWithPlugins = registerPlugins(cache, [ debugPlugin ]);

cacheWithPlugins.runDiagnostics(); // method added by debug plugin
```

### createItem(key, value, namespace, \[extra\])

```javascript
import { createItem } from 'stash-it';

const item = createItem('key', 'value', 'namespace', { some: 'extraData' });
```

And that's it.

For full docs, checkout https://smolak.github.io/stash-it/.
