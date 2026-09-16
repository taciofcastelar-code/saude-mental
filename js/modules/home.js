import {safeQueue} from '../storage.js';
export function renderHome(){return `<section class='card'><h2>Início</h2><div class='grid'>
<button class='action' data-go='atendimentos'><strong>Registrar atendimento</strong><span class='muted'>Sem identificador direto do paciente.</span></button>
<button class='action' data-go='auditoria'><strong>Auditar prontuário</strong><span class='muted'>Prontuário/Código restrito.</span></button>
<button class='action' data-go='treinamentos'><strong>Registrar treinamento</strong><span class='muted'>Cobertura por profissional e período.</span></button>
<button class='action' data-go='dashboard'><strong>Indicadores</strong><span class='muted'>Visão municipal.</span></button>
<button class='action' data-go='status'><strong>Status da integração</strong><span class='muted'>API, planilha e ${safeQueue.count()} pendência(s) offline.</span></button>
</div></section><section class='card'><h3>Privacidade</h3><p class='muted'>Atendimento não coleta nome, CPF, telefone ou endereço. Auditoria contém Prontuário/Código e não expõe esse campo no Dashboard.</p></section>`}
