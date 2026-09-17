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
    return json({ok:true,app:'Saúde Mental Serra V5.5',structure:validarEstrutura(),user:user,forms:{atendimentos:true}});
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
    return {ok:true,versao:'5.5',migrados:result.migrados,trigger:true,estrutura:validarEstrutura()};
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
  const book=ss();
  const atend=lerLinhas_(book.getSheetByName('IMPORT_Atendimentos'),5,9);
  const treino=lerLinhas_(book.getSheetByName('IMPORT_Treinamentos'),5,10);
  const audit=lerLinhas_(book.getSheetByName('IMPORT_Auditoria'),5,16);
  const escopos=['Municipal (3 UPAs)','Serra Sede','Carapina','Castelândia','HMIS'];
  const unidades={};
  escopos.forEach(e=>unidades[e]={
    atendimentos:resumoAtendimentos_(filtrarEscopo_(atend,e,2)),
    treinamento:resumoTreinamentos_(filtrarEscopoTreino_(treino,e)),
    auditoria:resumoAuditoria_(filtrarEscopo_(audit,e,2))
  });
  const comparativo=['Serra Sede','Carapina','Castelândia','HMIS'].map(unidade=>{
    const x=unidades[unidade];
    return {unidade,atendimentos:x.atendimentos.total,criseAnsiosa:x.atendimentos.criseAnsiosa,agitacao:x.atendimentos.agitacao,tentativas:x.atendimentos.tentativas,treinados:x.treinamento.profissionaisTreinados,assertividade:x.auditoria.assertividade};
  });
  return {versao:'5.5',geradoEm:new Date(),unidades,comparativo,treinamentos:resumoTreinamentos_(treino)};
}
function lerLinhas_(sh,startRow,nCols){
  if(!sh)return [];
  const last=sh.getLastRow(); if(last<startRow)return [];
  return sh.getRange(startRow,1,last-startRow+1,nCols).getValues().filter(r=>r.some(v=>v!==''&&v!==null));
}
function norm_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()}
function unidadeCanonica_(v){
  const k=norm_(v); if(k.includes('SERRA SEDE'))return 'Serra Sede'; if(k.includes('CARAPINA'))return 'Carapina'; if(k.includes('CASTELANDIA'))return 'Castelândia'; if(k.includes('HMIS'))return 'HMIS'; return 'Outras instituições';
}
function filtrarEscopo_(rows,escopo,colUnidade){
  if(escopo==='Municipal (3 UPAs)')return rows.filter(r=>ALLOWED_UPAS.includes(unidadeCanonica_(r[colUnidade])));
  return rows.filter(r=>unidadeCanonica_(r[colUnidade])===escopo);
}
function filtrarEscopoTreino_(rows,escopo){return filtrarEscopo_(rows,escopo,3)}
function inc_(o,k,n){k=String(k||'Não informado').trim()||'Não informado';o[k]=(o[k]||0)+(n||1)}
function resumoAtendimentos_(rows){
  const tipos={},faixas={},desfechos={},intervencoes={}; let rapsSim=0,rapsResp=0,notifSim=0,notifResp=0,tent=0,totalIntervencoes=0;
  rows.forEach(r=>{
    inc_(tipos,r[3]);inc_(faixas,r[4]);inc_(desfechos,r[5]);
    const tipo=norm_(r[3]); if(tipo.includes('TENTATIVA')&&tipo.includes('SUICID'))tent++;
    const ir=String(r[6]||'').trim();
    if(!ir||norm_(ir)==='NAO'){inc_(intervencoes,'Sem intervenção');totalIntervencoes++}
    else ir.split(',').map(x=>x.trim()).filter(Boolean).forEach(x=>{inc_(intervencoes,x);totalIntervencoes++});
    const rp=norm_(r[7]); if(rp==='SIM'||rp==='NAO'){rapsResp++;if(rp==='SIM')rapsSim++}
    if(tipo.includes('TENTATIVA')&&tipo.includes('SUICID')){const nt=norm_(r[8]);if(nt==='SIM'||nt==='NAO'){notifResp++;if(nt==='SIM')notifSim++}}
  });
  return {total:rows.length,criseAnsiosa:tipos['Crise ansiosa']||0,agitacao:tipos['Agitação psicomotora']||0,tentativas:tent,rapsPrevio:rapsResp?rapsSim/rapsResp:null,notificacaoTentativas:notifResp?notifSim/notifResp:null,tipos,faixas,desfechos,intervencoes,totalIntervencoes};
}
function resumoTreinamentos_(rows){
  const pessoas=new Map(),categorias={},instituicoes={},matriz={}; let participacoes=0;
  rows.forEach(r=>{
    if(norm_(r[5])!=='SIM')return;
    participacoes++;
    const nome=String(r[1]||'').trim(); if(!nome)return;
    const categoria=String(r[2]||'Não informado').trim()||'Não informado';
    const instituicao=String(r[3]||'Não informado').trim()||'Não informado';
    const key=norm_(nome);
    if(!pessoas.has(key)){
      pessoas.set(key,{nome,categoria,instituicao});
      inc_(categorias,categoria);
      inc_(instituicoes,instituicao);
      if(!matriz[instituicao])matriz[instituicao]={};
      inc_(matriz[instituicao],categoria);
    }
  });
  return {profissionaisTreinados:pessoas.size,participacoes,categorias,instituicoes,matriz};
}
function resumoAuditoria_(rows){
  const labels=['Avaliação clínica','Sinais vitais','Causa orgânica','Classificação de risco','Risco suicida','Manejo','Contenção','Encaminhamento','Plano de alta','Notificação'];
  const criterios={}; labels.forEach(x=>criterios[x]={sim:0,nao:0,aplicaveis:0,adesao:null});
  let sim=0,aplic=0,nao=0;
  rows.forEach(r=>{for(let i=0;i<10;i++){const v=norm_(r[5+i]);if(v!=='SIM'&&v!=='NAO')continue;criterios[labels[i]].aplicaveis++;aplic++;if(v==='SIM'){criterios[labels[i]].sim++;sim++}else{criterios[labels[i]].nao++;nao++}}});
  labels.forEach(x=>{const c=criterios[x];c.adesao=c.aplicaveis?c.sim/c.aplicaveis:null});
  return {totalAuditorias:rows.length,assertividade:aplic?sim/aplic:null,naoConformidades:nao,criterios};
}
function v(x){return(x===''||x==null)?null:Number(x)}

function testarLeituraSemGravar(){
  const result=validarEstrutura(); if(!result.ok)throw new Error('Abas ausentes: '+result.missing.join(', '));
  Logger.log(JSON.stringify(dashboard())); return result;
}
