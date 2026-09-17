export const navigate=r=>location.hash=r;
export const currentRoute=()=> (location.hash||'#dashboard').replace('#','');
