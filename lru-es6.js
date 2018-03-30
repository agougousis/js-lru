/**
 *  Licensed under MIT. See README.md for details.
 * 
 * A class-based version of lru.js.
 */

const PREVIOUS = Symbol('previous');
const NEXT = Symbol('next');
const CREATED_AT = Symbol('created_at');

class Entry {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this[CREATED_AT] = new Date().getTime();
    this[PREVIOUS] = undefined;
    this[NEXT] = undefined;
  }
}

/**
 * 
 * @param {int} lifetime     The maximum period (in minutes) that a cache entry is considered 
 *                           valid and can be used. A value of zero will disable lifetime expiration.
 * @param {int} limit        (optional) The maximum number of entries that can be placed in the cache.
 * @param {Iterable} entries (optional) key-value pairs to be used as initial cache content.
 */
class LRUCache {

  constructor(lifetime, limit, entries) {
    if (typeof limit !== 'number') {
      // called as (entries)
      entries = limit;
      limit = 0;
    }

    this.lifetime = lifetime;
    this.size = 0;
    this.limit = limit;
    this.tail = this.head = undefined;
    this._keymap = new Map();

    if (entries) {
      this.assign(entries);
      if (limit < 1) {
        this.limit = this.size;
      }
    }
  }

  assign = (entries) => {

    let lastAddedEntry;

    // If this is a new object and the limit property has not been
    // set, we can assign as many as Number.MAX_VALUE entries. The
    // limit property will be set later to the number of entries we
    // did assign.
    let limit = this.limit || Number.MAX_VALUE;

    this._keymap.clear();

    // Iterate through the provided key/value pairs
    let it = entries[Symbol.iterator]();
    for (let itv = it.next(); !itv.done; itv = it.next()) {

      // Build the entry to be stored
      let newEntry = new Entry(itv.value[0], itv.value[1]);

      // Add the entry to the map
      this._keymap.set(newEntry.key, newEntry);

      // Update the linked list (we need this only once)
      if (!lastAddedEntry) {
        this.tail = newEntry;
      } else {
        lastAddedEntry[PREVIOUS] = newEntry;
        newEntry[NEXT] = lastAddedEntry;
      }

      lastAddedEntry = newEntry;

      // Check we have added too many entries
      if (limit-- === 0) {
        throw new Error('overflow');
      }
    }

    // Update the list head pointer (we need this only once)
    this.head = lastAddedEntry;

    // Update the list size
    this.size = this._keymap.size;
  };

  has = (key) => {

    if (this._keymap.has(key)) {

      // We are not using lifetime
      if (this.lifetime === 0) {
        return true;
      }

      // Entries have a lifetime
      var entry = this._keymap.get(key);

      var now = new Date().getTime();
      var ageInMinutes = (now - entry[CREATED_AT]) / (60000);

      if (ageInMinutes > this.lifetime) {
        this['delete'](key); // Expired! Delete it!

        return false;
      }

      return true;
    }

    return false;
  };

  get = (key) => {

    if (!this.has(key)) {
      throw new Error('notFound');
    }

    var entry = this._keymap.get(key);

    this._markEntryAsUsed(entry);

    return entry.value;
  };

  set = (key, value) => {

    // Key already exists
    if (this._keymap.has(key)) {
      var entry = this._keymap.get(key);
      entry.value = value;

      this._markEntryAsUsed(entry, true);

      return this;
    }

    // Key does not exist
    this._keymap.set(key, (entry = new Entry(key, value)));

    if (this.size > 0) {                  // Non-empty list
      this.head[PREVIOUS] = entry;
      entry[NEXT] = this.head;
    } else {                              // Empty list   
      this.tail = entry;
    }

    this.head = entry; // In any case, this entry becomes head

    ++this.size;

    // If we hit the limit, remove the tail (LRU entry)
    if (this.size > this.limit) {
      this.removeLRUItem();
    }

    return this;
  };

  removeLRUItem = () => {

    // Special case: Empty list
    if (this.size === 0) {
      return undefined;
    }

    var entry = this.tail;

    if (this.size === 1) {
      // Special case: Only one entry in the list
      this.tail = undefined;
      this.head = undefined;
    } else {
      // All other cases
      this.tail = this.tail[PREVIOUS];
      this.tail[NEXT] = undefined;
    }

    --this.size;

    this._purgeRemovedEntry(entry);

    return [entry.key, entry.value];
  };

  delete = (key) => {
    var entry = this._keymap.get(key);

    if (!entry) return;

    this._keymap.delete(entry.key);

    if (entry[PREVIOUS] && entry[NEXT]) {
      // relink the NEXT entry with the PREVIOUS entry
      entry[NEXT][PREVIOUS] = entry[PREVIOUS];
      entry[PREVIOUS][NEXT] = entry[NEXT];
    } else if (entry[PREVIOUS]) {
      // remove the link to us
      entry[PREVIOUS][NEXT] = undefined;
      // link the PREVIOUS entry to head
      this.tail = entry[PREVIOUS];
    } else if (entry[NEXT]) {
      // remove the link to us
      entry[NEXT][PREVIOUS] = undefined;
      // link the PREVIOUS entry to head
      this.head = entry[NEXT];
    } else {// if(entry[NEXT] === undefined && entry.PREVIOUS === undefined) {
      this.tail = this.head = undefined;
    }

    this.size--;

    return entry.value;
  };

  clear = () => {
    // Not clearing links should be safe, as we don't expose live links to user
    this.tail = this.head = undefined;
    this.size = 0;
    this._keymap.clear();
  };

  _markEntryAsUsed = (entry, renewAge = false) => {
    // If this entry in the HEAD of the list (the most recently
    // used), then there is no need for update
    if (entry === this.head) {
      return;
    }

    // Remove the entry from its current position (modify the chain)
    entry[PREVIOUS][NEXT] = entry[NEXT];

    if (entry !== this.tail) {
      entry[NEXT][PREVIOUS] = entry[PREVIOUS];
    }

    // Put the entry in front of the current HEAD and update the head 
    // and tail pointers. WARNING: The order of actions matters!
    if (entry === this.tail) {
      this.tail = entry[PREVIOUS];
    }

    entry[PREVIOUS] = undefined;
    this.head[PREVIOUS] = entry;
    entry[NEXT] = this.head;
    this.head = entry;

    if (renewAge) {
      this[CREATED_AT] = new Date().getTime();
    }
  };

  _purgeRemovedEntry = (entry) => {
    // Remove last strong reference to <entry> and remove links from the purged entry
    entry[PREVIOUS] = entry[NEXT] = undefined;

    this._keymap.delete(entry.key);
  }

  // ----------------------------------------------------------------------------
  // Following code is optional and can be removed without breaking the core
  // functionality.

  find = (key) => {
    let e = this._keymap.get(key);
    return e ? e.value : undefined;
  };

  keys = () => {
    return new KeyIterator(this.tail);
  };

  values = () => {
    return new ValueIterator(this.tail);
  };

  entries = () => {
    return this;
  };

  [Symbol.iterator]() {
    return new EntryIterator(this.tail);
  };

  forEach = (fun, thisObj) => {
    if (typeof thisObj !== 'object') {
      thisObj = this;
    }
    let entry = this.tail;
    while (entry) {
      fun.call(thisObj, entry.value, entry.key, this);
      entry = entry[PREVIOUS];
    }
  };

  /** Returns a JSON (array) representation */
  toJSON = (withDate = false) => {
    var output = new Array(this.size);
    var i = 0;
    var entry = this.tail;

    while (entry) {
      output[i] = {
        key: entry.key,
        value: entry.value
      };

      if (withDate) {
        output[i].created_at = (new Date(entry[CREATED_AT])).toLocaleString();
      }

      i++;

      entry = entry[PREVIOUS];
    }

    return output;
  };

  /** Returns a String representation */
  toString = (withDate = false) => {
    var output = '';
    var entry = this.tail;

    while (entry) {

      var entryString = String(entry.key) + ':' + entry.value;

      if (withDate) {
        var dateString = new Date(entry[CREATED_AT]).toLocaleString();
        entryString += ' (' + dateString + ')';

      }

      output += entryString;

      entry = entry[PREVIOUS];

      if (entry) {
        output += ' < ';
      }
    }

    return output;
  };

}

function EntryIterator(oldestEntry) { this.entry = oldestEntry; }
EntryIterator.prototype[Symbol.iterator] = function () { return this; }
EntryIterator.prototype.next = function () {
  let ent = this.entry;
  if (ent) {
    this.entry = ent[PREVIOUS];
    return { done: false, value: [ent.key, ent.value] };
  } else {
    return { done: true, value: undefined };
  }
};


function KeyIterator(oldestEntry) { this.entry = oldestEntry; }
KeyIterator.prototype[Symbol.iterator] = function () { return this; }
KeyIterator.prototype.next = function () {
  let ent = this.entry;
  if (ent) {
    this.entry = ent[PREVIOUS];
    return { done: false, value: ent.key };
  } else {
    return { done: true, value: undefined };
  }
};

function ValueIterator(oldestEntry) { this.entry = oldestEntry; }
ValueIterator.prototype[Symbol.iterator] = function () { return this; }
ValueIterator.prototype.next = function () {
  let ent = this.entry;
  if (ent) {
    this.entry = ent[PREVIOUS];
    return { done: false, value: ent.value };
  } else {
    return { done: true, value: undefined };
  }
};

export default LRUCache;



