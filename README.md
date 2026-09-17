# Saúde Mental Serra – PWA V5.3

Versão de homologação do monitoramento municipal de saúde mental nas UPAs.

## Arquitetura V5.3

Atendimento assistencial usa uma única fonte oficial de coleta:

Google Forms → Apps Script V5.3 → Planilha Mestre → Indicadores → Dashboard PWA.

O módulo Atendimento do PWA não grava mais uma segunda ficha; ele abre o Google Forms oficial.

## Componentes

- PWA instalável em GitHub Pages.
- Atendimento direcionado ao Google Forms oficial.
- Apps Script V5.3 como gateway de integração.
- Planilha Mestre TESTE durante homologação.
- Dashboard conectado à aba Indicadores.
- Auditoria e Treinamentos mantidos como módulos gerenciais.
- Tela Status valida o endpoint do Apps Script e a estrutura da Mestre.

## Segurança

A homologação está com AUTH_REQUIRED=false. Não utilizar dados reais restritos até concluir autenticação/autorização institucional. Auditoria contém Prontuário/Código e Treinamentos pode conter identificação profissional.

## Publicação

Substitua os arquivos do repositório pelos arquivos desta versão, mantendo a estrutura de pastas. O service worker usa cache `sm-serra-v5-3-0`, forçando a atualização dos arquivos da PWA.
