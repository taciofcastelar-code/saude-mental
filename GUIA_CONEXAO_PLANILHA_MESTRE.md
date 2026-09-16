# PRÓXIMO PASSO — CONECTAR A PWA V5.1 À PLANILHA MESTRE

A Planilha Mestre oficial já foi pré-configurada no backend:

`1SIAEpWpah9yJOBE-ZvI8I5EsqbdOl9BtkNefanVNtGU`

## 1. Publicar o backend no Google Apps Script

1. Acesse `https://script.google.com`.
2. Novo projeto.
3. Apague o conteúdo de `Code.gs`.
4. Cole todo o conteúdo do arquivo `apps-script-Code.gs`.
5. Salve.
6. No seletor de funções, execute **testarLeituraSemGravar**.
7. Autorize o acesso à sua conta.
8. Abra `Executions/Registro` e confirme que a função terminou sem erro.

Essa função NÃO grava dados. Ela apenas:
- abre a Planilha Mestre;
- verifica as abas obrigatórias;
- lê alguns indicadores.

## 2. Implantar como Web App

1. Clique em **Deploy / Implantar**.
2. **New deployment / Nova implantação**.
3. Tipo: **Web app / Aplicativo da Web**.
4. Executar como: **você**.
5. Acesso: escolha conforme a política institucional.
6. Implantar.
7. Copie a URL que termina em `/exec`.

## 3. Informar a URL na PWA

Abra:

`js/config.js`

Troque:

`API_URL: ""`

por:

`API_URL: "SUA_URL_EXEC"`

e altere:

`MOCK_MODE: true`

para:

`MOCK_MODE: false`

## 4. Publicar a PWA

GitHub Pages:
- envie a pasta `pwa_sm_v5` para um repositório;
- Settings → Pages;
- Deploy from branch;
- branch `main`;
- pasta `/root`.

## 5. Homologação

No aplicativo publicado:

1. Abra **Status da integração**.
2. Deve aparecer:
   `API conectada e estrutura da Planilha Mestre validada.`
3. Registre 1 atendimento fictício.
4. Confira `IMPORT_Atendimentos`.
5. Confira a aba `Atendimentos`.
6. Confira `Indicadores`.
7. Confira o Dashboard.
8. Repita para Auditoria e Treinamentos.

## Critério para avançar

A integração está homologada quando:
- os 3 módulos gravam corretamente;
- nenhum dado é deslocado de coluna;
- indicadores recalculam;
- Dashboard reflete os registros;
- Auditoria não salva offline;
- Treinamentos não salva offline;
- Atendimento pode usar fila offline segura.
