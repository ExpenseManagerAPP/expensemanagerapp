# Usuários e administradores

O app não usa o XSUAA nem role collections do BTP. Quem pode entrar e quem é administrador fica na tabela `Users` do próprio app, no HANA. Ela não é exposta em nenhum serviço OData; só as rotas `/auth` (e, mais adiante, as ações de admin) leem e alteram essa tabela.

## A tabela `Users`

| Campo | Para que serve |
|---|---|
| `Email` | Identifica o usuário. É o `req.user.id` dentro do CAP, o mesmo valor gravado em `Persons.createdBy` (dono dos dados) e em `Shares.User` (compartilhamento) |
| `PasswordHash` | Hash scrypt da senha. A senha em si nunca é gravada nem registrada no log |
| `Role` | `User` ou `Admin` |
| `Status` | `Active`, `Pending` (aguardando confirmação) ou `Disabled` |
| `MustChangePassword` | Obriga a trocar a senha no próximo login |
| `TokenVersion` | Sobe a cada troca de senha (ou desativação), invalidando todos os tokens emitidos antes |

## Como o app sabe quem é admin

**É admin quem tem `Role = 'Admin'` na tabela `Users`.** Nada mais conta: nem o email, nem variáveis de ambiente, nem o BTP.

A cada requisição:

1. O front manda `Authorization: Bearer <token>`.
2. O `srv/auth/app-auth.ts` valida a assinatura e a validade do token, busca o usuário na tabela (com cache de 30 segundos) e confere se ele está `Active` e com a mesma `TokenVersion` do token.
3. Monta o `req.user` com:
   - id = `Email`;
   - papel `ExpenseManagerUser`, exigido por todos os serviços;
   - papel `Admin` também, se `Role = 'Admin'`.
4. As ações só de administrador (tela de administração, etapa 3 do item 7) exigem `@requires: 'Admin'`, então o CAP recusa quem não tem esse papel.

Quem está com troca de senha pendente não recebe papel nenhum: só consegue chamar as rotas `/auth`, até trocar a senha.

## Para que servem `ADMIN_EMAIL` e `ADMIN_PASSWORD`

Servem **só para criar o primeiro administrador**. Num banco novo a tabela `Users` está vazia; sem esse bootstrap ninguém conseguiria entrar para cadastrar os outros.

Na subida do app (`srv/auth/UserBootstrap.ts`, a cada start):

| Situação | O que acontece |
|---|---|
| Não existe usuário com `ADMIN_EMAIL` | Cria o usuário com `Role = 'Admin'`, senha = `ADMIN_PASSWORD` e **troca de senha obrigatória** |
| Já existe usuário com esse email, mas não é admin | Promove para `Admin` |
| Já existe e não tem senha | Define a senha de `ADMIN_PASSWORD`, com troca obrigatória |
| Já existe e tem senha | Não mexe na senha |
| `ADMIN_EMAIL` vazio | Não faz nada (aparece um aviso no workflow) |

O `ADMIN_PASSWORD` é, portanto, uma **senha de primeiro acesso**:

- No primeiro login o app leva para a tela "Crie sua senha".
- Depois da troca, o valor de `ADMIN_PASSWORD` não funciona mais, mesmo continuando gravado no GitHub e nas variáveis do app.
- Mudar o `ADMIN_PASSWORD` depois **não** altera a senha de um admin que já tem senha.

Detalhes que vale saber:

- **Tirar o `ADMIN_EMAIL` não rebaixa ninguém.** O bootstrap só cria ou promove, nunca remove o papel.
- **Trocar o `ADMIN_EMAIL` cria (ou promove) outro admin.** O anterior continua admin.
- **Para ter vários admins**, promova os usuários pela tela de administração (etapa 3 do item 7). Até ela existir, o caminho é apontar o `ADMIN_EMAIL` para o usuário e rodar o passo de login do workflow, que reinicia o app.
- **Esqueceu a senha do admin?**
  - Outro admin poderá redefinir a senha pela tela de administração (etapa 3).
  - O "esqueci a senha" por email chega na etapa 2.
  - Sem outro admin, `ADMIN_PASSWORD` não ajuda, porque o usuário já tem senha. O caminho é apontar o `ADMIN_EMAIL` para um email novo, entrar com ele e redefinir a senha do antigo.

## Usuários dos dados existentes

Se o banco já tiver dados (por exemplo, depois de restaurar um backup), o bootstrap cria um usuário para cada dono (`Persons.createdBy`) e para cada destinatário de compartilhamento (`Shares.User`) que ainda não exista na tabela. Esses usuários entram **sem senha**: não conseguem fazer login até um admin definir uma senha para eles (ou, quando existir, pelo "esqueci a senha").

## `SETTINGS_SECRET`

- Assina os tokens de login e é obrigatório no BTP. O passo "Configure login" do workflow falha se ele faltar.
- Trocar o valor invalida todas as sessões abertas: todo mundo precisa entrar de novo. Senhas e usuários não são afetados.

## Configuração no GitHub (repositório do CAP)

| Nome | Tipo | Uso |
|---|---|---|
| `SETTINGS_SECRET` | Secret | Assina os tokens (ex.: `openssl rand -base64 48`) |
| `ADMIN_EMAIL` | Variable | Email do primeiro administrador |
| `ADMIN_PASSWORD` | Secret | Senha de primeiro acesso desse administrador |

O workflow **Setup BTP trial**, no passo "Configure login", grava essas três envs no app `ExpenseManagerApp-srv` com `cf set-env` e reinicia o app. O bootstrap roda nessa subida.
