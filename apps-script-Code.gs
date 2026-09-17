const SPREADSHEET_ID='1_Rxr_8L3uNOZeWvP3kF4nGPk_pyzVBcpK3VXpD4QD5U'; // TESTE durante homologação
const FORM_ATENDIMENTOS_RESP_ID='1NWz7wXlq7ku5IMxLPBhWJ28unqRfeTCVHc8Gmhb1kU0';
const FORM_ATENDIMENTOS_SHEET='Respostas ao formulário 1';
const AUTH_REQUIRED=false;
const ALLOWED_UPAS=['Serra Sede','Carapina','Castelândia'];
const CRISES=['Crise ansiosa','Agitação psicomotora','Tentativa de suicídio','Outros'];
const SIM_NAO_NA=['Sim','Não','N/A'];

function doGet(e){
  try{
    const action=(e&&e.parameter&&e.parameter.action)||'health';
    if(action!=='health')return json({ok:false,error:'Ação GET inválida.'});
    const user=getUserContext(false);
    return json({ok:true,app:'Saúde Mental Serra V5.3',structure:validarEstrutura(),user:user,forms:{atendimentos:true}});
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
    // V5.3: atendimento assistencial é coletado oficialmente pelo Google Forms.
    if(action==='salvarAtendimento')throw new Error('Registro assistencial deve ser realizado pelo Google Forms oficial.');
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

/**
 * EXECUTAR UMA ÚNICA VEZ na homologação.
 * 1) copia e normaliza o histórico do Forms para IMPORT_Atendimentos;
 * 2) substitui o IMPORTRANGE por dados estáticos;
 * 3) instala o gatilho para futuras respostas do Forms.
 */
function configurarIntegracaoV53(){
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    ensureBackendSheets();
    const result=migrarHistoricoAtendimentosForms_();
    alinharIndicadoresAtendimentos_();
    instalarTriggerAtendimentosV53_();
    return {ok:true,versao:'5.3',migrados:result.migrados,trigger:true,estrutura:validarEstrutura()};
  }finally{lock.releaseLock()}
}

function instalarTriggerAtendimentosV53_(){
  ScriptApp.getProjectTriggers()
    .filter(t=>t.getHandlerFunction()==='onFormSubmitAtendimento')
    .forEach(t=>ScriptApp.deleteTrigger(t));
  const origem=SpreadsheetApp.openById(FORM_ATENDIMENTOS_RESP_ID);
  ScriptApp.newTrigger('onFormSubmitAtendimento').forSpreadsheet(origem).onFormSubmit().create();
}

function onFormSubmitAtendimento(e){
  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(15000);
    if(!e||!e.values)throw new Error('Evento do Forms sem valores.');
    const row=normalizarLinhaForms_(e.values);
    const saved=gravarAtendimentoSeNovo_(row);
    logRequest('FORM-'+Utilities.getUuid(),'formAtendimento','GOOGLE_FORMS',row[2],true,saved?'importado':'duplicado');
  }catch(err){
    try{logRequest('FORM-ERRO-'+Utilities.getUuid(),'formAtendimento','GOOGLE_FORMS','',false,String(err.message||err))}catch(_){}
    throw err;
  }finally{try{lock.releaseLock()}catch(_){}}
}

function migrarHistoricoAtendimentosForms_(){
  const origem=SpreadsheetApp.openById(FORM_ATENDIMENTOS_RESP_ID).getSheetByName(FORM_ATENDIMENTOS_SHEET);
  if(!origem)throw new Error('Aba de respostas do Forms não encontrada.');
  const values=origem.getDataRange().getValues();
  const target=ss().getSheetByName('IMPORT_Atendimentos');
  if(!target)throw new Error('Aba IMPORT_Atendimentos não encontrada.');

  // Preserva linhas 1-4 (título/instruções/cabeçalho) e elimina o IMPORTRANGE a partir da linha 5.
  const rowsToClear=Math.max(target.getMaxRows()-4,1);
  target.getRange(5,1,rowsToClear,9).clearContent();

  const out=[];
  for(let i=1;i<values.length;i++){
    if(!values[i][0])continue;
    out.push(normalizarLinhaForms_(values[i]));
  }
  if(out.length)target.getRange(5,1,out.length,9).setValues(out);
  return {migrados:out.length};
}

function normalizarLinhaForms_(v){
  // Origem Forms: timestamp, unidade, data, tipo, faixa, desfecho, intervenção, RAPS, notificação.
  return [
    dataSegura_(v[0]),
    dataSegura_(v[2]),
    normalizarUpa_(v[1]),
    normalizarTipo_(v[3]),
    normalizarFaixa_(v[4]),
    normalizarDesfecho_(v[5]),
    normalizarIntervencao_(v[6]),
    normalizarSimNao_(v[7]),
    normalizarNotificacao_(v[8],v[3])
  ];
}

function gravarAtendimentoSeNovo_(row){
  const sh=ss().getSheetByName('IMPORT_Atendimentos');
  const last=sh.getLastRow();
  const ts=timestampKey_(row[0]);
  if(last>=5){
    const existentes=sh.getRange(5,1,last-4,1).getValues().map(r=>timestampKey_(r[0]));
    if(existentes.includes(ts))return false;
  }
  sh.appendRow(row);
  return true;
}

function timestampKey_(v){
  const d=dataSegura_(v);
  return d instanceof Date && !isNaN(d) ? Utilities.formatDate(d,'America/Sao_Paulo','yyyy-MM-dd HH:mm:ss') : String(v||'');
}
function dataSegura_(v){
  if(v instanceof Date)return v;
  const s=String(v||'').trim();
  if(!s)return '';
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
  const d=new Date(s);
  return isNaN(d)?s:d;
}
function chave_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()}
function normalizarUpa_(v){
  const k=chave_(v);
  if(k.includes('SERRA SEDE'))return 'Serra Sede';
  if(k.includes('CARAPINA'))return 'Carapina';
  if(k.includes('CASTELANDIA'))return 'Castelândia';
  if(k.includes('HMIS'))return 'HMIS';
  return String(v||'').trim();
}
function normalizarTipo_(v){
  const k=chave_(v);
  if(k.includes('CRISE ANSIOSA'))return 'Crise ansiosa';
  if(k.includes('AGITACAO PSICOMOTORA'))return 'Agitação psicomotora';
  if(k.includes('TENTATIVA')&&k.includes('SUICID'))return 'Tentativa de suicídio';
  if(k.includes('OUTRO'))return 'Outros';
  return String(v||'').trim();
}
function normalizarFaixa_(v){
  const k=chave_(v);
  if(k.includes('CRIANCA'))return 'Criança (0 a 11 anos)';
  if(k.includes('ADOLESCENTE'))return 'Adolescente (12 a 17 anos)';
  if(k.includes('ADULTO'))return 'Adulto (18 a 59 anos)';
  if(k.includes('IDOSO'))return 'Idoso (60 anos ou mais)';
  return String(v||'').trim();
}
function normalizarDesfecho_(v){
  const k=chave_(v);
  if(k==='ALTA')return 'Alta';
  if(k.includes('CAPS'))return 'Encaminhamento para CAPS';
  if(k.includes('APS')||k.includes('UBS')||k.includes('URS'))return 'Encaminhamento para APS / UBS / URS';
  if(k.includes('TRANSFERENCIA')||k.includes('INTERNACAO'))return 'Transferência / internação hospitalar';
  if(k.includes('OUTRO'))return 'Outro';
  return String(v||'').trim();
}
function normalizarIntervencao_(v){
  const s=String(v||'').trim();
  const k=chave_(s);
  if(!s||k==='NAO')return 'Não';
  // Mantém combinações do Forms (ex.: MEDICAÇÃO, CONTENÇÃO FÍSICA), apenas padronizando caixa.
  return s.toLowerCase().replace(/(^|,\s*)(.)/g,(m,p,c)=>p+c.toUpperCase());
}
function normalizarSimNao_(v){
  const k=chave_(v);
  if(k==='SIM')return 'Sim';
  if(k==='NAO')return 'Não';
  if(k.includes('NAO INFORM'))return 'Não informado';
  return String(v||'').trim();
}
function normalizarNotificacao_(v,tipo){
  if(normalizarTipo_(tipo)!=='Tentativa de suicídio')return '';
  return normalizarSimNao_(v);
}


function alinharIndicadoresAtendimentos_(){
  const sh=ss().getSheetByName('Indicadores');
  if(!sh)throw new Error('Aba Indicadores não encontrada.');
  // Usa os mesmos nomes canônicos da coluna Unidade de atendimento.
  sh.getRange('I4:L4').setValues([['Serra Sede','Carapina','Castelândia','HMIS']]);
}

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
    'Profissional UPA':[],
    'Auditor':['salvarAuditoria','dashboard'],
    'Coordenação':['salvarAuditoria','salvarTreinamento','dashboard'],
    'Gerência':['salvarAuditoria','salvarTreinamento','dashboard']
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
  const perfil=sh.getRange('H4:L14').getDisplayValues();
  const total=perfil.length>1?perfil[1].slice(1).reduce((s,x)=>s+(Number(String(x).replace(',','.'))||0),0):0;
  const tent=perfil.length>4?perfil[4].slice(1).reduce((s,x)=>s+(Number(String(x).replace(',','.'))||0),0):0;
  return {
    totalAtendimentos:total,
    tentativas:tent,
    notificacao:v(sh.getRange('E14').getValue()),
    cobertura:v(sh.getRange('E5').getValue()),
    assertividade:v(sh.getRange('E12').getValue()),
    indicadores:sh.getRange('A4:F14').getDisplayValues(),
    perfilAtendimentos:perfil
  };
}
function v(x){return(x===''||x==null)?null:Number(x)}

function testarLeituraSemGravar(){
  const result=validarEstrutura(); if(!result.ok)throw new Error('Abas ausentes: '+result.missing.join(', '));
  Logger.log(JSON.stringify(dashboard())); return result;
}
