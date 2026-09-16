# PWA Saúde Mental Serra V5.2 — Correções da auditoria

## Corrigido nesta versão
- ID da Planilha Mestre oficial pré-configurado no Apps Script.
- Tela **Status da integração** conectada à navegação.
- Sincronização automática da fila offline de Atendimentos ao recuperar internet.
- Contador de pendências e botão de sincronização manual.
- Idempotência por `requestId` para reduzir risco de registros duplicados.
- `PWA_LOG` para trilha técnica de requisições.
- `PWA_USUARIOS` e autorização por perfil preparadas para ambiente institucional.
- Validação de campos e valores no backend.
- Timeout e mensagens de erro de API melhorados.
- Dashboard passa a receber a tabela de indicadores da Planilha Mestre.
- Service Worker atualizado para cache `sm-serra-v5-2-0` e estratégia network-first.

## Segurança
`AUTH_REQUIRED=false` por padrão para homologação controlada.
Não mude para `true` antes de:
1. executar `configurarBackendV52()`;
2. preencher `PWA_USUARIOS`;
3. implantar o Web App em ambiente Google Workspace onde `Session.getActiveUser().getEmail()` identifique o usuário;
4. testar os quatro perfis.

## Homologação recomendada
1. Cole `apps-script-Code.gs` em um novo projeto Apps Script.
2. Execute `testarLeituraSemGravar()`.
3. Execute `configurarBackendV52()` para criar `PWA_LOG` e `PWA_USUARIOS`.
4. Implante como Web App e copie a URL `/exec`.
5. Em `js/config.js`, defina `API_URL` e `MOCK_MODE:false`.
6. Publique a PWA.
7. Abra `Status da integração`.
8. Faça um atendimento fictício online.
9. Faça um atendimento fictício offline e confirme sincronização ao voltar online.
10. Teste Auditoria e Treinamentos apenas online.
11. Confirme atualização das abas IMPORT_*, bases, Indicadores e Dashboard.
