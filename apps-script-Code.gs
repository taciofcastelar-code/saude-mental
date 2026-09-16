const SPREADSHEET_ID='1SIAEpWpah9yJOBE-ZvI8I5EsqbdOl9BtkNefanVNtGU';
const AUTH_REQUIRED=false; // true somente após configurar PWA_USUARIOS e validar o ambiente Google Workspace
const ALLOWED_UPAS=['Serra Sede','Carapina','Castelândia'];
const CRISES=['Crise ansiosa','Agitação psicomotora','Tentativa de suicídio','Outros'];
const SIM_NAO_NA=['Sim','Não','N/A'];

function doGet(e){
  try{
    const action=(e&&e.parameter&&e.parameter.action)||'health';
    if(action!=='health')return json({ok:false,error:'Ação GET inválida.'});
    const user=getUserContext(false);
    return json({ok:true,app:'Saúde Mental Serra V5.2',structure:validarEstrutura(),user:user});
  }catch(err){return json({ok:false,error:String(err.message||err)})}
}

function doPost(e){
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(15000);
    const r=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const action=r.action,p=r.payload||{},requestId=String(r.requestId||'');
    if(!requestId)throw new Error('requestId ausente.');
    ensureBackendSheets();
    const user=getUserContext(AUTH_REQUIRED);
    requirePermission(user,action,p);
    const prior=findRequest(requestId);
    if(prior)return json({ok:true,duplicate:true,requestId,data:{saved:true}});
    let d;
    if(action==='salvarAtendimento')d=salvarAtendimento(p);
    else if(action==='salvarAuditoria')d=salvarAuditoria(p);
    else if(action==='salvarTreinamento')d=salvarTreinamento(p);
    else if(action==='dashboard')d=dashboard();
    else throw new Error('Ação inválida.');
    logRequest(requestId,action,user.email||'PILOTO',p.upa||'',true,'');
    return json({ok:true,requestId,data:d});
  }catch(err){return json({ok:false,error:String(err.message||err)})}
  finally{try{lock.releaseLock()}catch(_){}}
}

function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function ss(){return SpreadsheetApp.openById(SPREADSHEET_ID)}

function validarEstrutura(){
  const required=['IMPORT_Atendimentos','IMPORT_Auditoria','IMPORT_Treinamentos','Atendimentos','Auditoria','Treinamentos','Indicadores','Dashboard'];
  const names=ss().getSheets().map(s=>s.getName());
  const missing=required.filter(n=>!names.includes(n));
  return {ok:missing.length===0,missing};
}

function ensureBackendSheets(){
  const book=ss();
  let log=book.getSheetByName('PWA_LOG');
  if(!log){log=book.insertSheet('PWA_LOG');log.appendRow(['requestId','timestamp','action','email','upa','success','message']);log.hideSheet();}
  let users=book.getSheetByName('PWA_USUARIOS');
  if(!users){users=book.insertSheet('PWA_USUARIOS');users.appendRow(['email','nome','perfil','upa','ativo']);}
}

function configurarBackendV52(){ensureBackendSheets();return validarEstrutura()}

function getUserContext(required){
  const email=(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
  if(!required)return {email:email,perfil:'PILOTO',upa:'',authenticated:!!email};
  if(!email)throw new Error('Não foi possível identificar o usuário Google. Revise a implantação institucional.');
  const sh=ss().getSheetByName('PWA_USUARIOS');
  const values=sh.getDataRange().getValues();
  for(let i=1;i<values.length;i++){
    if(String(values[i][0]).trim().toLowerCase()===email && String(values[i][4]).toLowerCase()==='sim')
      return {email,nome:values[i][1],perfil:String(values[i][2]),upa:String(values[i][3]),authenticated:true};
  }
  throw new Error('Usuário sem autorização ativa.');
}

function requirePermission(user,action,p){
  if(!AUTH_REQUIRED)return;
  const role=user.perfil;
  const allowed={
    'Profissional UPA':['salvarAtendimento'],
    'Auditor':['salvarAtendimento','salvarAuditoria','dashboard'],
    'Coordenação':['salvarAtendimento','salvarAuditoria','salvarTreinamento','dashboard'],
    'Gerência':['salvarAtendimento','salvarAuditoria','salvarTreinamento','dashboard']
  };
  if(!(allowed[role]||[]).includes(action))throw new Error('Perfil sem permissão para esta ação.');
  if(user.upa && p.upa && role!=='Gerência' && user.upa!==p.upa)throw new Error('Usuário não autorizado para esta UPA.');
}

function findRequest(id){
  const sh=ss().getSheetByName('PWA_LOG');
  if(!sh||sh.getLastRow()<2)return false;
  return !!sh.getRange(2,1,sh.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext();
}
function logRequest(id,action,email,upa,success,message){ss().getSheetByName('PWA_LOG').appendRow([id,new Date(),action,email,upa,success,message])}
function append(n,v){const sh=ss().getSheetByName(n);if(!sh)throw new Error('Aba não encontrada: '+n);sh.appendRow(v)}
function required(p,fields){fields.forEach(f=>{if(p[f]===undefined||p[f]===null||String(p[f]).trim()==='')throw new Error('Campo obrigatório ausente: '+f)})}
function oneOf(value,allowed,label){if(!allowed.includes(value))throw new Error(`${label} inválido.`)}

function salvarAtendimento(p){
  required(p,['data','upa','tipo','faixa','desfecho','intervencao','raps']); oneOf(p.upa,ALLOWED_UPAS,'UPA'); oneOf(p.tipo,CRISES,'Tipo de crise');
  if(p.tipo==='Tentativa de suicídio'&&!p.notificacao)throw new Error('Notificação deve ser informada na tentativa de suicídio.');
  append('IMPORT_Atendimentos',[new Date(),p.data,p.upa,p.tipo,p.faixa,p.desfecho,p.intervencao,p.raps,p.notificacao||'']); return {saved:true};
}
function salvarAuditoria(p){
  required(p,['data','upa','prontuario','tipo','avaliacaoClinica','sinaisVitais','causaOrganica','classificacaoRisco','riscoSuicida','manejo','contencao','encaminhamento','planoAlta','notificacao']);
  oneOf(p.upa,ALLOWED_UPAS,'UPA'); oneOf(p.tipo,CRISES,'Tipo de crise');
  ['avaliacaoClinica','sinaisVitais','causaOrganica','classificacaoRisco','riscoSuicida','manejo','contencao','encaminhamento','planoAlta','notificacao'].forEach(k=>oneOf(p[k],SIM_NAO_NA,k));
  append('IMPORT_Auditoria',[new Date(),p.data,p.upa,p.prontuario,p.tipo,p.avaliacaoClinica,p.sinaisVitais,p.causaOrganica,p.classificacaoRisco,p.riscoSuicida,p.manejo,p.contencao,p.encaminhamento,p.planoAlta,p.notificacao,p.observacoes||'']); return {saved:true};
}
function salvarTreinamento(p){
  required(p,['profissional','categoria','upa','elegivel','realizado','periodo']); oneOf(p.upa,ALLOWED_UPAS,'UPA');
  append('IMPORT_Treinamentos',[new Date(),p.profissional,p.categoria,p.upa,p.elegivel,p.realizado,p.dataTreinamento||'',p.turma||'',p.periodo,p.observacoes||'']); return {saved:true};
}

function dashboard(){
  const sh=ss().getSheetByName('Indicadores'); if(!sh)throw new Error('Aba Indicadores não encontrada.');
  return {
    totalAtendimentos:Number(sh.getRange('L5').getValue()||0),
    tentativas:Number(sh.getRange('L8').getValue()||0),
    notificacao:v(sh.getRange('E14').getValue()),
    cobertura:v(sh.getRange('E5').getValue()),
    assertividade:v(sh.getRange('E12').getValue()),
    indicadores:sh.getRange('A4:F14').getDisplayValues()
  };
}
function v(x){return(x===''||x==null)?null:Number(x)}

function testarLeituraSemGravar(){
  const result=validarEstrutura(); if(!result.ok)throw new Error('Abas ausentes: '+result.missing.join(', '));
  Logger.log(JSON.stringify(dashboard())); return result;
}
