// An entry holds the key and value, and pointers to any older and newer entries.
interface Entry<K,V> {
  key   :K;
  value :V;
}

export class LRUMap<K,V> {
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

  // Convenience constructor equivalent to `new LRUMap(count(entries), entries)`
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
  set(key :K, value :V) : LRUMap<K,V>;

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
  forEach(fun :(value :V, key :K, m :LRUMap<K,V>)=>void, thisArg? :any) : void;

  // Returns an object suitable for JSON encoding. The withDate parameter defines
  // whether the entry creation date will be included in the returned object. It 
  // defaults to false.
  toJSON(withDate? :boolean) : Array<{key :K, value :V}>;

  // Returns a human-readable text representation. The withDate parameter defines
  // whether the entry creation date will be included in the representation. It 
  // defaults to false.
  toString(withDate? :boolean) : string;
}
