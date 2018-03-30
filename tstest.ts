import {LRUCache} from './lru'

let m = new LRUCache<number, number>(0, 3);
let entit = m.entries();
let k : number = entit.next().value[0];
let v : number = entit.next().value[1];
