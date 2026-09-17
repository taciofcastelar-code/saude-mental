export function renderHome(){return `<section class='card'><h2>Início</h2><div class='grid'>
<button class='action' data-go='atendimentos'><strong>Registrar atendimento</strong><span class='muted'>Abre o Google Forms oficial.</span></button>
<button class='action' data-go='auditoria'><strong>Auditar prontuário</strong><span class='muted'>Prontuário/Código restrito.</span></button>
<button class='action' data-go='treinamentos'><strong>Registrar treinamento</strong><span class='muted'>Cobertura por profissional e período.</span></button>
<button class='action' data-go='dashboard'><strong>Indicadores</strong><span class='muted'>Visão municipal integrada à Planilha Mestre.</span></button>
<button class='action' data-go='status'><strong>Status da integração</strong><span class='muted'>Verifica conexão com o Apps Script e a estrutura da Mestre.</span></button>
</div></section><section class='card'><h3>Arquitetura V5.3</h3><p class='muted'>Atendimentos: Google Forms → Apps Script → Planilha Mestre → Indicadores → App. Auditoria e Treinamentos permanecem como módulos gerenciais durante a homologação.</p></section><section class='card'><h3>Privacidade</h3><p class='muted'>O formulário de atendimento não coleta nome, CPF, telefone ou endereço. Auditoria contém Prontuário/Código e não expõe esse campo no Dashboard.</p></section>`}
