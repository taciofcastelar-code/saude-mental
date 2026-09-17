const DB='sm_serra_v5_db';
const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
export const demoDb={
  get(){return load(DB,{atendimentos:[],auditorias:[],treinamentos:[]})},
  push(collection,item){const db=this.get();db[collection].push(item);save(DB,db);return item}
};
