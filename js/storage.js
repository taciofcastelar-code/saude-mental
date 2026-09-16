const DB = 'sm_serra_v5_db';
const QUEUE = 'sm_serra_v5_queue';

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const demoDb = {
  get(){ return load(DB, {atendimentos:[], auditorias:[], treinamentos:[]}); },
  push(collection, item){
    const db = this.get();
    db[collection].push(item);
    save(DB, db);
    return item;
  }
};

export const safeQueue = {
  get(){ return load(QUEUE, []); },
  count(){ return this.get().length; },
  add(item){
    const q = this.get();
    q.push(item);
    save(QUEUE, q);
    window.dispatchEvent(new CustomEvent('queue-changed', {detail:{count:q.length}}));
  },
  replace(items){
    save(QUEUE, items);
    window.dispatchEvent(new CustomEvent('queue-changed', {detail:{count:items.length}}));
  },
  clear(){ this.replace([]); }
};
