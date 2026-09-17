import {currentRoute,navigate} from './router.js';
import {renderHome} from './modules/home.js';
import {renderAtendimentos,bindAtendimentos} from './modules/atendimentos.js';
import {renderAuditoria,bindAuditoria} from './modules/auditoria.js';
import {renderTreinamentos,bindTreinamentos} from './modules/treinamentos.js';
import {renderDashboard,bindDashboard} from './modules/dashboard.js';
import {renderStatus,bindStatus} from './modules/status.js';

const app=document.querySelector('#app'),toast=document.querySelector('#toast');
const routes={
  home:[renderHome,bindGo],
  atendimentos:[renderAtendimentos,()=>bindAtendimentos(showToast)],
  auditoria:[renderAuditoria,()=>bindAuditoria(showToast)],
  treinamentos:[renderTreinamentos,()=>bindTreinamentos(showToast)],
  dashboard:[renderDashboard,bindDashboard],
  status:[renderStatus,()=>bindStatus(showToast)]
};
function showToast(m){toast.textContent=m;toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3400)}
function bindGo(){document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go))}
function render(){const r=routes[currentRoute()]||routes.home;app.innerHTML=r[0]();r[1]();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.route===currentRoute()))}
document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>navigate(b.dataset.route));
window.addEventListener('hashchange',render);
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
let deferred;const btn=document.querySelector('#installBtn');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;btn.classList.remove('hidden')});
btn.onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;btn.classList.add('hidden')};
