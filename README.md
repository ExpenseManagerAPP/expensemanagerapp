# Expense Manager App - CAP

Backend do [Expense Manager App](https://expensemanagerapp.github.io/) em SAP CAP (TypeScript), com SAP HANA Cloud e login próprio. O front-end UI5 fica em [expensemanagerapp.github.io](https://github.com/ExpenseManagerAPP/expensemanagerapp.github.io) e chama o serviço `/service/ExpenseManager/` diretamente (sem approuter); o fluxo de login está em [docs/authentication-flow.md](docs/authentication-flow.md).

## Desenvolvimento local

```bash
npm install
npx cds-tsx watch       # http://localhost:4004
```

Usuários de teste (tabela `Users`, senha `123456`): `davi@teste.com` (admin), `beatriz@teste.com` e `novo@teste.com` (precisa trocar a senha no primeiro acesso). Em desenvolvimento os serviços também aceitam Basic com esses usuários.

| Endpoint | Descrição |
|---|---|
| `/service/ExpenseManager/` | Serviço OData V4 (exige login) |
| `/auth/password`, `/auth/refresh`, `/auth/change-password`, `/auth/me` | Login, renovação do token, troca de senha e perfil |
| `/health` | Health check padrão do CAP |
| `/health/db` | Público; responde `UP` quando o banco está acessível e `503` quando o HANA está parado |

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `SETTINGS_SECRET` | Obrigatória no BTP. Valor aleatório longo que assina os tokens de login |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Criam o primeiro administrador na subida (se ainda não existir) |
| `AUTH_RATE_LIMIT` | Opcional. Tentativas de login por IP a cada 15 minutos (padrão 10) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Servidor, porta (padrão 587), email e senha de app usados no envio de emails |

## Deploy no BTP Trial

O MTA `ExpenseManagerApp` cria o app `ExpenseManagerApp-srv` e o container HDI `ExpenseManagerApp-db` no HANA Cloud do space. Não usa XSUAA: os usuários ficam na tabela `Users` do próprio app.

```bash
npm run bd
cf deploy mta_archives/ExpenseManagerApp_1.0.0.mtar
```

No trial o HANA Cloud é parado toda noite. Dois workflows cuidam do ambiente:

| Workflow | Quando roda | O que faz |
|---|---|---|
| [Start BTP trial](.github/workflows/start-trial.yml) | 15:13, 17:13, 19:13, 20:13, 21:13 e 00:13 (Brasília) e sob demanda | Se `/health/db` já responde, termina sem fazer nada; caso contrário inicia o HANA Cloud, reinicia o `ExpenseManagerApp-srv` e confere se o banco responde. Os horários repetidos compensam os atrasos dos agendamentos do GitHub |
| [Setup BTP trial](.github/workflows/setup-trial.yml) | Manual (conta nova ou novo deploy) | Inicia o HANA se estiver parado e executa as etapas escolhidas: build e deploy do MTA, configuração do login (segredo e primeiro admin), do SMTP e atualização do `webapp/config/runtime-config.json` do UI5 com a URL do CAP, com commit que publica o GitHub Pages |

| Configuração (Settings > Secrets and variables > Actions) | Tipo | Valor |
|---|---|---|
| `CF_USERNAME` | Secret | Email do usuário do BTP |
| `CF_PASSWORD` | Secret | Senha do usuário do BTP |
| `SETTINGS_SECRET` | Secret | Valor aleatório longo (ex.: `openssl rand -base64 48`) |
| `ADMIN_PASSWORD` | Secret | Senha inicial do administrador |
| `UI5_REPO_TOKEN` | Secret | Fine-grained token com *Contents: Read and write* no repositório do UI5 |
| `SMTP_PASSWORD` | Secret | Senha de app do Gmail |
| `CF_ORG` | Variable | Org do Cloud Foundry (ex.: `d4e1c97ctrial`) |
| `ADMIN_EMAIL` | Variable | Email do administrador |
| `SMTP_USER` | Variable | Email que envia as mensagens |
| `CF_API` | Variable | Opcional, padrão `https://api.cf.us10-001.hana.ondemand.com` |
| `CF_SPACE` | Variable | Opcional, padrão `dev` |
| `CF_APP` | Variable | Opcional, padrão `ExpenseManagerApp-srv` |
| `HANA_INSTANCE` | Variable | Opcional; sem ela o workflow usa a primeira instância `hana-cloud*` do space |
| `SMTP_HOST` / `SMTP_PORT` | Variable | Opcionais, padrão `smtp.gmail.com` / `587` |
| `UI5_REPOSITORY` | Variable | Opcional, padrão `ExpenseManagerAPP/expensemanagerapp.github.io` |

Ao recriar a conta trial: crie a instância do SAP HANA Cloud, atualize `CF_ORG` (e `CF_API`, se a região mudar) e rode **Setup BTP trial** com todas as etapas.

O GitHub desativa workflows agendados em repositórios sem atividade por 60 dias; nesse caso basta reativá-lo na aba Actions.
