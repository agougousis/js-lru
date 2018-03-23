/**
 * A doubly linked list-based Least Recently Used (LRU) cache. Will keep most
 * recently used items while discarding least recently used items when its limit
 * is reached.
 *
 * Licensed under MIT. Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
 * See README.md for details.
 *
 * Illustration of the design:
 *
 *       entry             entry             entry             entry
 *       ______            ______            ______            ______
 *      | head |.PREVIOUS => |      |.PREVIOUS => |      |.PREVIOUS => | tail |
 *      |  A   |          |  B   |          |  C   |          |  D   |
 *      |______| <= NEXT.|______| <= NEXT.|______| <= NEXT.|______|
 *
 *  removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 */
(function(g,f){
  const e = typeof exports == 'object' ? exports : typeof g == 'object' ? g : {};
  f(e);
  if (typeof define == 'function' && define.amd) { define('lru', e); }
})(this, function(exports) {

const PREVIOUS = Symbol('previous');
const NEXT     = Symbol('next');

function LRUMap(limit, entries) {
  if (typeof limit !== 'number') {
    // called as (entries)
    entries = limit;
    limit = 0;
  }

  this.size = 0;
  this.limit = limit;
  this.tail = this.newest = undefined;
  this._keymap = new Map();

  if (entries) {
    this.assign(entries);
    if (limit < 1) {
      this.limit = this.size;
    }
  }
}

exports.LRUMap = LRUMap;

function Entry(key, value) {
  this.key = key;
  this.value = value;
  this[PREVIOUS] = undefined;
  this[NEXT] = undefined;
}


LRUMap.prototype._markEntryAsUsed = function(entry) {
  if (entry === this.newest) {
    // Already the most recenlty used entry, so no need to update the list
    return;
  }
  // HEAD--------------TAIL
  //   <.NEXT   .PREVIOUS>
  //  <--- add direction --
  //   A  B  C  <D>  E
  if (entry[PREVIOUS]) {
    if (entry === this.tail) {
      this.tail = entry[PREVIOUS];
    }
    entry[PREVIOUS][NEXT] = entry[NEXT]; // C <-- E.
  }
  if (entry[NEXT]) {
    entry[NEXT][PREVIOUS] = entry[PREVIOUS]; // C. --> E
  }
  entry[PREVIOUS] = undefined; // D --x
  entry[NEXT] = this.newest; // D. --> E
  if (this.newest) {
    this.newest[PREVIOUS] = entry; // E. <-- D
  }
  this.newest = entry;
};

LRUMap.prototype.assign = function(entries) {
  let entry, limit = this.limit || Number.MAX_VALUE;
  this._keymap.clear();
  let it = entries[Symbol.iterator]();
  for (let itv = it.next(); !itv.done; itv = it.next()) {
    let e = new Entry(itv.value[0], itv.value[1]);
    this._keymap.set(e.key, e);
    if (!entry) {
      this.tail = e;
    } else {
      entry[PREVIOUS] = e;
      e[NEXT] = entry;
    }
    entry = e;
    if (limit-- == 0) {
      throw new Error('overflow');
    }
  }
  this.newest = entry;
  this.size = this._keymap.size;
};

LRUMap.prototype.get = function(key) {
  // First, find our cache entry
  var entry = this._keymap.get(key);
  if (!entry) return; // Not cached. Sorry.
  // As <key> was found in the cache, register it as being requested recently
  this._markEntryAsUsed(entry);
  return entry.value;
};

LRUMap.prototype.set = function(key, value) {
  var entry = this._keymap.get(key);

  if (entry) {
    // update existing
    entry.value = value;
    this._markEntryAsUsed(entry);
    return this;
  }

  // new entry
  this._keymap.set(key, (entry = new Entry(key, value)));

  if (this.newest) {
    // link previous tail to the new tail (entry)
    this.newest[PREVIOUS] = entry;
    entry[NEXT] = this.newest;
  } else {
    // we're first in -- yay
    this.tail = entry;
  }

  // add new entry to the end of the linked list -- it's now the freshest entry.
  this.newest = entry;
  ++this.size;
  if (this.size > this.limit) {
    // we hit the limit -- remove the head
    this.removeLRUItem();
  }

  return this;
};

LRUMap.prototype.removeLRUItem = function () {

  // Special case: Empty list
  if (this.size == 0) {
    return undefined;
  }

  var entry = this.tail;

  if (this.size == 1) {
    // Special case: Only one entry in the list
    this.tail = undefined;
    this.head = undefined;
  } else {
    // All other cases
    this.tail        = this.tail[PREVIOUS];
    this.tail[NEXT] = undefined;
  }    

  --this.size;

  this.purgeRemovedEntry(entry);

  return [entry.key, entry.value];
};

LRUMap.prototype.purgeRemovedEntry = function (entry) {
    // Remove last strong reference to <entry> and remove links from the purged entry
    entry[PREVIOUS] = entry[NEXT] = undefined;

    this._keymap.delete(entry.key);
}

// ----------------------------------------------------------------------------
// Following code is optional and can be removed without breaking the core
// functionality.

LRUMap.prototype.find = function(key) {
  let e = this._keymap.get(key);
  return e ? e.value : undefined;
};

LRUMap.prototype.has = function(key) {
  return this._keymap.has(key);
};

LRUMap.prototype['delete'] = function(key) {
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
    this.newest = entry[NEXT];
  } else {// if(entry[NEXT] === undefined && entry.PREVIOUS === undefined) {
    this.tail = this.newest = undefined;
  }

  this.size--;
  return entry.value;
};

LRUMap.prototype.clear = function() {
  // Not clearing links should be safe, as we don't expose live links to user
  this.tail = this.newest = undefined;
  this.size = 0;
  this._keymap.clear();
};


function EntryIterator(oldestEntry) { this.entry = oldestEntry; }
EntryIterator.prototype[Symbol.iterator] = function() { return this; }
EntryIterator.prototype.next = function() {
  let ent = this.entry;
  if (ent) {
    this.entry = ent[PREVIOUS];
    return { done: false, value: [ent.key, ent.value] };
  } else {
    return { done: true, value: undefined };
  }
};


function KeyIterator(oldestEntry) { this.entry = oldestEntry; }
KeyIterator.prototype[Symbol.iterator] = function() { return this; }
KeyIterator.prototype.next = function() {
  let ent = this.entry;
  if (ent) {
    this.entry = ent[PREVIOUS];
    return { done: false, value: ent.key };
  } else {
    return { done: true, value: undefined };
  }
};

function ValueIterator(oldestEntry) { this.entry = oldestEntry; }
ValueIterator.prototype[Symbol.iterator] = function() { return this; }
ValueIterator.prototype.next = function() {
  let ent = this.entry;
  if (ent) {
    this.entry = ent[PREVIOUS];
    return { done: false, value: ent.value };
  } else {
    return { done: true, value: undefined };
  }
};


LRUMap.prototype.keys = function() {
  return new KeyIterator(this.tail);
};

LRUMap.prototype.values = function() {
  return new ValueIterator(this.tail);
};

LRUMap.prototype.entries = function() {
  return this;
};

LRUMap.prototype[Symbol.iterator] = function() {
  return new EntryIterator(this.tail);
};

LRUMap.prototype.forEach = function(fun, thisObj) {
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
LRUMap.prototype.toJSON = function() {
  var s = new Array(this.size), i = 0, entry = this.tail;
  while (entry) {
    s[i++] = { key: entry.key, value: entry.value };
    entry = entry[PREVIOUS];
  }
  return s;
};

/** Returns a String representation */
LRUMap.prototype.toString = function() {
  var s = '', entry = this.tail;
  while (entry) {
    s += String(entry.key)+':'+entry.value;
    entry = entry[PREVIOUS];
    if (entry) {
      s += ' < ';
    }
  }
  return s;
};

});
