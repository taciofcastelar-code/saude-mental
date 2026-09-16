# Saúde Mental Serra – PWA V5.1

Versão modular para piloto do monitoramento municipal das UPAs.

## Já implementado
- PWA instalável: manifest + service worker.
- Mobile-first e desktop.
- Módulos: Atendimento, Auditoria, Treinamentos e Dashboard.
- Atendimento sem nome, CPF, telefone ou endereço do paciente.
- `Prontuário/Código` somente na Auditoria e fora do Dashboard.
- Fila offline somente para Atendimento.
- Auditoria e Treinamentos bloqueados offline por conterem dados restritos/identificação profissional.
- Camada `api.js` separa o front-end do armazenamento.
- Modo de demonstração local sem servidor (`MOCK_MODE=true`).
- Backend Google Apps Script para gravar direto nas abas IMPORT_* da Planilha Mestre.
- Dashboard conectado à aba `Indicadores`.

## Testar localmente
Na pasta do projeto:

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`.

## Conectar à Planilha Mestre
1. Abra `apps-script-Code.gs`.
2. Crie projeto no Google Apps Script e cole o código.
3. Substitua `COLE_AQUI_O_ID_DA_PLANILHA_MESTRE` pelo ID da Planilha Mestre Google Sheets.
4. Faça Deploy como Web App.
5. Copie a URL do Web App.
6. Em `js/config.js`, cole a URL em `API_URL` e altere `MOCK_MODE` para `false`.

## Publicar como PWA
Pode ser publicada em GitHub Pages. HTTPS é necessário para instalação e service worker fora de localhost.

## Segurança
Esta entrega é uma base robusta de piloto, não uma solução de autenticação pronta para produção institucional. O seletor/perfil local não deve ser usado como controle de acesso real.

Para produção oficial, adicionar:
- autenticação Google Workspace/Firebase/Supabase/SSO;
- autorização por perfil;
- logs e trilha de auditoria;
- expiração de sessão;
- política institucional de acesso ao Google Sheets/Apps Script.

## Migração futura
O front-end não depende diretamente do Google Sheets. A camada `api.js` permite trocar Apps Script/Sheets por Supabase/PostgreSQL/Firebase sem reconstruir as telas.


## V5.1
- ID da Planilha Mestre oficial pré-configurado no backend.
- Endpoint GET `?action=health` para validação sem gravação.
- Função `testarLeituraSemGravar()`.
- Tela `Status da integração`.
- Guia de conexão e homologação incluído.
