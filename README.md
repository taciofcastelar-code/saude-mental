# Saúde Mental Serra — PWA V5.6

Aplicativo de gestão e monitoramento do Protocolo Municipal de Manejo Integral das Crises em Saúde Mental.

## V5.6
- Dashboard como tela inicial.
- Separação de indicadores por UPA: Serra Sede, Carapina e Castelândia; HMIS aparece separadamente quando houver dados.
- Perfil assistencial: faixa etária, tipo de crise, desfecho, intervenções, RAPS prévia e notificação de tentativas de suicídio.
- Treinamentos integrados à Lista de Presença, com contagem de profissionais únicos e participações.
- Auditoria transformada em indicador de adesão ao protocolo e mapa de não conformidades.
- Atendimento permanece coletado exclusivamente pelo Google Forms oficial.
- Backend agrega métricas sem expor prontuário no Dashboard.

## Homologação
A configuração atual aponta para a Planilha Mestre TESTE. O acesso ao backend permanece sem autenticação obrigatória durante homologação (`AUTH_REQUIRED=false`). Não utilizar dados restritos reais até a configuração institucional de acesso.


## Treinamentos V5.6
A Lista de Presença é a fonte oficial. O app agrega profissionais únicos por instituição e categoria e não publica dados pessoais dos participantes.
