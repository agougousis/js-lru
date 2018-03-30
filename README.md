# Least Recently Used (LRU) with Lifetime cache algorithm

A finite key-value map using the [Least Recently Used (LRU)](http://en.wikipedia.org/wiki/Cache_algorithms#Least_Recently_Used) algorithm, where the most recently-used items are "kept alive" while older, less-recently used items are evicted to make room for newer items.

Useful when you want to limit use of memory to only hold commonly-used things.

On the top of LRU functionality, a maximum lifetime can be defined for cached entries. The expired entries are removed in a 'lazy' way. This means that when an entry expires it is not removed automatically. But the expired entry will be removed if someone tries to retrieve it (through the get() method) or check if it is still in cache (throught the has() method). So, an item that is expired will never be used.

## Terminology & design

- Based on a doubly-linked list for low complexity random shuffling of entries.

- The cache object iself has a "head" (least recently used entry) and a
  "tail" (most recently used entry).

- An entry might have a "previous" (newer) and a "next" (older) entry (doubly-linked, "next" being close to "tail" and "previous"
  being closer to "head").

- Key lookup is done through a key-entry mapping native object, which on most 
  platforms mean `O(1)` complexity. This comes at a very low memory cost  (for 
  storing two extra pointers for each entry).

Fancy ASCII art illustration of the general design:

```txt
           entry                entry                entry                entry        
           ______               ______               ______               ______       
          | tail |    .next => |      |    .next => |      |    .next => | head |      
  .tail = |  A   |             |  B   |             |  C   |             |  D   | = .head
          |______| <= previous.|______| <= previous.|______| <= previous.|______|      
                                                                             
       removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
```

## Example (taking into account only the LRU functionality)

```js
let c = new LRUCache(0, 3) // lifetime = 0 => no expiration
c.set('adam',   29)
c.set('john',   26)
c.set('angela', 24)
c.toString()        // -> "adam:29 < john:26 < angela:24"
c.get('john')       // -> 26

// Now 'john' is the most recently used entry, since we just requested it
c.toString()        // -> "adam:29 < angela:24 < john:26"
c.set('zorro', 141) // -> {key:adam, value:29}

// Because we only have room for 3 entries, adding 'zorro' caused 'adam'
// to be removed in order to make room for the new entry
c.toString()        // -> "angela:24 < john:26 < zorro:141"
```

# Usage

**Recommended:** Copy the code in lru.js or copy the lru.js and lru.d.ts files into your source directory. For minimal functionality, you only need the lines up until the comment that says "Following code is optional".

**Using NPM:** [`yarn add lru_map`](https://www.npmjs.com/package/lru_map) (note that because NPM is one large flat namespace, you need to import the module as "lru_map" rather than simply "lru".)

**Using AMD:** An [AMD](https://github.com/amdjs/amdjs-api/blob/master/AMD.md#amd) module loader like [`amdld`](https://github.com/rsms/js-amdld) can be used to load this module as well. There should be nothing to configure.

**Testing**:

- Run tests with `npm test`
- Run benchmarks with `npm run benchmark`

**ES compatibility:** This implementation is compatible with modern JavaScript environments and depend on the following features not found in ES5:

- `const` and `let` keywords
- `Symbol` including `Symbol.iterator`
- `Map`

> Note: If you need ES5 compatibility e.g. to use with older browsers, [please use version 2](https://github.com/rsms/js-lru/tree/v2) which has a slightly less feature-full API but is well-tested and about as fast as this implementation.

**Using with TypeScript**

This module comes with complete typing coverage for use with TypeScript. If you copied the code or files rather than using a module loader, make sure to include `lru.d.ts` into the same location where you put `lru.js`.

```ts
import {LRUCache} from './lru'
// import {LRUCache} from 'lru'     // when using via AMD
// import {LRUCache} from 'lru_map' // when using from NPM
console.log('LRUCache:', LRUCache)
```

# API

The API imitates that of [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), which means that in most cases you can use `LRUCache` as a drop-in replacement for `Map`.

```ts
export class LRUCache<K,V> {
  // Construct a new cache object which will hold up to limit entries.
  // When the size == limit, a `put` operation will evict the oldest entry.
  //
  // The `lifetime` is the maximum lifetime that a cache entry is considered valid.
  // It is expressed in minutes. If we set it to zero, the entries do not expire.
  //
  // If `entries` is provided, all entries are added to the new map.
  // `entries` should be an Array or other iterable object whose elements are
  // key-value pairs (2-element Arrays). Each key-value pair is added to the new Map.
  // null is treated as undefined.
  constructor(lifetime :number, limit :number, entries? :Iterable<[K,V]>);

  // Convenience constructor equivalent to `new LRUMLRUCacheap(count(entries), entries)`
  constructor(lifetime :number, entries :Iterable<[K,V]>);

  // Current number of items
  size :number;

  // Maximum number of items this map can hold
  limit :number;

  // Least recently-used entry. Invalidated when map is modified.
  oldest :Entry<K,V>;

  // Most recently-used entry. Invalidated when map is modified.
  newest :Entry<K,V>;

  // Replace all values in this map with key-value pairs (2-element Arrays) from
  // provided iterable.
  assign(entries :Iterable<[K,V]>) : void;

  // Put <value> into the cache associated with <key>. Replaces any existing entry
  // with the same key. Returns `this`.
  set(key :K, value :V) : LRUCache<K,V>;

  // Purge the least recently used (oldest) entry from the cache.
  // Returns the removed entry or undefined if the cache was empty.
  removeLRUItem() : [K,V] | undefined;

  // Get and register recent use of <key>.
  // It will returns the value associated with <key>, if the key exists and the entry
  // is not expired. Otherwise, it will throw an error. For that reason, you should
  // always check, in advance, if a valid key exists by using the has() method.
  get(key :K) : V;

  // Check if there's a value for key in the cache without registering recent use.
  // If the key refers to an expired entry, the entry will be removed and the returned
  // value will be false.
  has(key :K) : boolean;

  // Access value for <key> without registering recent use or removing expired entry.
  // Useful if you do not want to chage the state of the map, but only "peek" at it.
  // Returns the value associated with <key> if found, or undefined if not found.
  find(key :K) : V | undefined;

  // Remove entry <key> from cache and return its value.
  // Returns the removed value, or undefined if not found.
  delete(key :K) : V | undefined;

  // Removes all entries
  clear() : void;

  // Returns an iterator over all keys, starting with the oldest.
  keys() : Iterator<K>;

  // Returns an iterator over all values, starting with the oldest.
  values() : Iterator<V>;

  // Returns an iterator over all entries, starting with the oldest.
  entries() : Iterator<[K,V]>;

  // Returns an iterator over all entries, starting with the oldest.
  [Symbol.iterator]() : Iterator<[K,V]>;

  // Call `fun` for each entry, starting with the oldest entry.
  forEach(fun :(value :V, key :K, m :LRUCache<K,V>)=>void, thisArg? :any) : void;

  // Returns an object suitable for JSON encoding. The withDate parameter defines
  // whether the entry creation date will be included in the returned object. It 
  // defaults to false.
  toJSON(withDate? :boolean) : Array<{key :K, value :V}>;

  // Returns a human-readable text representation. The withDate parameter defines
  // whether the entry creation date will be included in the representation. It 
  // defaults to false.
  toString(withDate? :boolean) : string;
}

// An entry holds the key and value, and pointers to any older and newer entries.
// Entries might hold references to adjacent entries in the internal linked-list.
// Therefore you should never store or modify Entry objects. Instead, reference the
// key and value of an entry when needed.
interface Entry<K,V> {
  key   :K;
  value :V;
}
```

If you need to perform any form of finalization of items as they are evicted from the cache, wrapping the `removeLRUItem` method is a good way to do it:

```js
let c = new LRUCache(0, 123);
c.removeLRUItem = function() {
  let entry = LRUCache.prototype.removeLRUItem.call(this);
  doSomethingWith(entry);
  return entry;
}
```

The internals calls `removeLRUItem` as entries need to be evicted, so this method is guaranteed to be called for any item that's removed from the cache. The returned entry must not include any strong references to other entries. See note in the documentation of `LRUCache.prototype.set()`.


# MIT license

Copyright (c) 2010-2016 Rasmus Andersson <https://rsms.me/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
