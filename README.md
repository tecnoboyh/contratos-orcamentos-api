# Contratos & Orçamentos API

API REST para um SaaS local de **controle de contratos, assinatura eletrônica, gestão de obras, orçamento e ordens de compra**.

O projeto foi criado com **Node.js**, **Express**, **Prisma** e **PostgreSQL**, seguindo uma estrutura simples por módulos para facilitar manutenção, demonstração e evolução.

---

## 1. Stack utilizada

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js |
| API | Express |
| ORM | Prisma |
| Banco | PostgreSQL |
| Autenticação | JWT |
| Criptografia de senha | bcryptjs |
| Envio de e-mail | Resend |
| Envio WhatsApp | W-API |
| Logs de ações | audit_logs |

---

## 2. Requisitos para rodar

Antes de iniciar, tenha instalado:

- Node.js 20 ou superior
- PostgreSQL local ou remoto
- npm
- Prisma CLI via dependência do projeto

Verifique as versões:

```bash
node -v
npm -v
```

---

## 3. Instalação

Clone ou extraia o projeto e entre na pasta da API:

```bash
cd contratos-orcamentos-api
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

No Windows, se estiver usando Prompt de Comando:

```bash
copy .env.example .env
```

---

## 4. Variáveis de ambiente

Arquivo `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/contratos_orcamentos?schema=public"
JWT_SECRET="troque_por_uma_chave_segura"
PORT=3333

FRONTEND_APP_URL="http://localhost:5173"

RESEND_API_KEY=""
RESEND_EMAIL_FROM="Contratos <onboarding@resend.dev>"

WAPI_BASE_URL=""
WAPI_TOKEN=""
WAPI_INSTANCE_ID=""
```

### Descrição das variáveis

| Variável | Uso |
|---|---|
| `DATABASE_URL` | URL de conexão com o PostgreSQL |
| `JWT_SECRET` | Chave usada para assinar os tokens JWT |
| `PORT` | Porta onde a API será executada |
| `FRONTEND_APP_URL` | URL do frontend usada para montar links públicos de assinatura |
| `RESEND_API_KEY` | Chave da Resend para envio de e-mails |
| `RESEND_EMAIL_FROM` | Remetente usado no envio de assinatura por e-mail |
| `WAPI_BASE_URL` | URL base da W-API |
| `WAPI_TOKEN` | Token da W-API |
| `WAPI_INSTANCE_ID` | Instância WhatsApp usada pela W-API |

---

## 5. Banco de dados e Prisma

Depois de configurar o `.env`, rode as migrations:

```bash
npx prisma migrate dev
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Para abrir o Prisma Studio:

```bash
npx prisma studio
```

---

## 6. Scripts disponíveis

No `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js"
  }
}
```

Rodar em desenvolvimento:

```bash
npm run dev
```

Rodar em modo normal:

```bash
npm start
```

A API deve subir em:

```txt
http://localhost:3333
```

Teste rápido:

```txt
GET http://localhost:3333/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "message": "API funcionando"
}
```

---

## 7. Estrutura de pastas

```txt
src/
├── config/
│   └── prisma.js
├── middlewares/
│   └── authMiddleware.js
├── modules/
│   ├── auth/
│   ├── companies/
│   ├── contracts/
│   ├── obras/
│   ├── signatures/
│   └── services/
├── utils/
│   └── jwt.js
├── routes.js
└── server.js
```

### Organização

| Pasta | Responsabilidade |
|---|---|
| `config` | Configuração do Prisma |
| `middlewares` | Middlewares da API, como autenticação |
| `modules/auth` | Cadastro e login |
| `modules/companies` | Empresas e seleção multi-tenant |
| `modules/contracts` | CRUD de contratos, renovação, encerramento, aditivos e envio para assinatura |
| `modules/signatures` | Rotas públicas para visualizar e assinar contratos |
| `modules/obras` | Gestão de obras, etapas, custos e vistorias |
| `modules/services` | Integrações externas, como Resend e W-API |
| `utils` | Funções auxiliares |

---

## 8. Multi-tenant

O sistema trabalha com isolamento por empresa.

Cada usuário pertence a uma empresa principal e também pode ter acesso a outras empresas pela tabela:

```txt
company_members
```

A empresa ativa é enviada pelo frontend no header:

```txt
x-company-id: ID_DA_EMPRESA
```

Todas as rotas protegidas usam o `companyId` do usuário autenticado para evitar acesso a dados de outra empresa.

---

## 9. Autenticação

A autenticação usa JWT.

Rotas públicas:

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/health
GET  /api/signatures/:id/view
POST /api/signatures/:id/sign
```

Rotas protegidas precisam do header:

```txt
Authorization: Bearer SEU_TOKEN
```

Quando houver alternância de empresa no frontend, envie também:

```txt
x-company-id: ID_DA_EMPRESA_SELECIONADA
```

---

## 10. Cadastro e login

### Cadastro

```txt
POST /api/auth/register
```

Body:

```json
{
  "companyName": "Empresa Teste",
  "cnpj": "12345678000199",
  "name": "Vinicius",
  "email": "vinicius@teste.com",
  "password": "123456"
}
```

Resposta:

```json
{
  "user": {
    "id": "uuid",
    "name": "Vinicius",
    "email": "vinicius@teste.com",
    "role": "ADMIN",
    "companyId": "uuid"
  },
  "company": {
    "id": "uuid",
    "name": "Empresa Teste",
    "cnpj": "12345678000199"
  },
  "token": "jwt"
}
```

### Login

```txt
POST /api/auth/login
```

Body:

```json
{
  "email": "vinicius@teste.com",
  "password": "123456"
}
```

---

## 11. Empresas

### Listar empresas do usuário

```txt
GET /api/companies
```

### Criar empresa

```txt
POST /api/companies
```

Body:

```json
{
  "name": "Nova Empresa LTDA",
  "cnpj": "12345678000190",
  "email": "contato@empresa.com",
  "phone": "62999999999"
}
```

Uso no sistema:

- permite alternar o ambiente no frontend;
- cada empresa possui seus próprios contratos, obras e ordens de compra;
- a empresa selecionada é enviada no header `x-company-id`.

---

## 12. Contratos

### Rotas principais

```txt
GET    /api/contracts
GET    /api/contracts/:id
POST   /api/contracts
PUT    /api/contracts/:id
DELETE /api/contracts/:id
```

### Criar contrato

```txt
POST /api/contracts
```

Body:

```json
{
  "title": "Contrato de Prestação de Serviço",
  "type": "SERVICE",
  "relatedParty": "João da Silva",
  "documentNumber": "12345678900",
  "totalValue": 5000,
  "monthlyValue": 1000,
  "startDate": "2026-06-01",
  "endDate": "2026-12-01",
  "content": "Contrato de prestação de serviço firmado entre as partes.",
  "filledFields": {
    "contratante": "Empresa Teste",
    "contratado": "João da Silva"
  }
}
```

### Tipos de contrato

```txt
SERVICE     Serviço
WORK        Obra
RENT        Locação
EMPLOYMENT  Trabalho
OTHER       Outro
```

### Status de contrato

```txt
DRAFT              Rascunho
WAITING_SIGNATURE  Aguardando assinatura
SIGNED             Assinado / arquivado
ACTIVE             Ativo
EXPIRING           Vencendo
CLOSED             Encerrado
EXPIRED            Expirado
CANCELED           Cancelado
```

### Filtros

```txt
GET /api/contracts?search=joao
GET /api/contracts?status=DRAFT
GET /api/contracts?type=SERVICE
```

---

## 13. Ações rápidas de contrato

### Renovar contrato

```txt
POST /api/contracts/:id/renew
```

Body:

```json
{
  "startDate": "2026-12-01",
  "endDate": "2027-12-01",
  "totalValue": 12000,
  "monthlyValue": 1000,
  "note": "Renovação por mais 12 meses."
}
```

### Encerrar contrato

```txt
POST /api/contracts/:id/close
```

Body:

```json
{
  "reason": "Contrato encerrado por conclusão do serviço.",
  "closedAt": "2026-06-26"
}
```

### Gerar aditivo

```txt
POST /api/contracts/:id/addendum
```

Body:

```json
{
  "title": "Aditivo - Contrato de Prestação de Serviço",
  "description": "Aditivo referente ao contrato original.",
  "totalValue": 6500,
  "monthlyValue": 1300,
  "startDate": "2026-06-01",
  "endDate": "2026-12-01"
}
```

---

## 14. Envio para assinatura

O contrato pode ser enviado para vários assinantes.

```txt
POST /api/contracts/:id/send-signature
```

Body para e-mail:

```json
{
  "channel": "EMAIL",
  "signers": [
    {
      "name": "João da Silva",
      "email": "joao@email.com"
    },
    {
      "name": "Maria Souza",
      "email": "maria@email.com"
    }
  ]
}
```

Body para WhatsApp:

```json
{
  "channel": "WHATSAPP",
  "signers": [
    {
      "name": "João da Silva",
      "phone": "5562999999999"
    }
  ]
}
```

Body para ambos:

```json
{
  "channel": "BOTH",
  "signers": [
    {
      "name": "João da Silva",
      "email": "joao@email.com",
      "phone": "5562999999999"
    }
  ]
}
```

### Regras

- cada assinante recebe um link próprio;
- cada assinante tem seu próprio status;
- o contrato só vira `SIGNED` quando todos os assinantes assinarem;
- quando todos assinam, o contrato recebe `signedAt` e `archivedAt`;
- contrato assinado deve ficar visível para o gerenciador/listagem de contratos arquivados.

---

## 15. Assinatura pública

Essas rotas são públicas, pois o assinante acessa pelo link recebido.

### Visualizar contrato

```txt
GET /api/signatures/:id/view
```

### Assinar contrato

```txt
POST /api/signatures/:id/sign
```

Fluxo:

1. sistema carrega a solicitação de assinatura;
2. valida se o link existe;
3. valida se não está expirado;
4. marca a assinatura como `SIGNED`;
5. verifica se ainda existem assinaturas pendentes;
6. se todos assinaram, arquiva o contrato.

---

## 16. Obras

### Rotas principais

```txt
GET    /api/obras
GET    /api/obras/:id
POST   /api/obras
PUT    /api/obras/:id
DELETE /api/obras/:id
```

### Criar obra vinculada a contrato

```txt
POST /api/obras
```

Body:

```json
{
  "contractId": "ID_DO_CONTRATO",
  "name": "Reforma do imóvel Jardim Brasil",
  "description": "Pintura e manutenção geral.",
  "location": "Rua X-15 Qd. 26 Lt. 02 Jardim Brasil",
  "expectedBudget": 12000,
  "startDate": "2026-06-20",
  "endDate": "2026-07-20"
}
```

Ao criar uma obra, o sistema cria automaticamente um roteiro básico:

```txt
Planejamento da obra
Vistoria inicial
Compra de materiais
Execução dos serviços
Vistoria final
Entrega da obra
```

### Filtros

```txt
GET /api/obras?search=reforma
GET /api/obras?status=IN_PROGRESS
GET /api/obras?contractId=ID_DO_CONTRATO
```

---

## 17. Etapas da obra

### Criar etapa manual

```txt
POST /api/obras/:id/steps
```

Body:

```json
{
  "title": "Instalação elétrica",
  "description": "Revisão dos pontos elétricos.",
  "phase": "EXECUCAO",
  "order": 7
}
```

### Concluir etapa

```txt
PATCH /api/obras/:id/steps/:stepId/complete
```

---

## 18. Custos da obra

### Lançar custo

```txt
POST /api/obras/:id/custos
```

Body:

```json
{
  "description": "Compra de tinta e materiais",
  "category": "MATERIAL",
  "amount": 1850.75,
  "paidAt": "2026-06-22"
}
```

Categorias:

```txt
MATERIAL
LABOR
EQUIPMENT
SERVICE
OTHER
```

Ao lançar custo, o orçamento realizado da obra é atualizado.

---

## 19. Vistorias

### Criar vistoria

```txt
POST /api/obras/:id/vistorias
```

Body:

```json
{
  "type": "INITIAL",
  "description": "Local com paredes desgastadas antes da obra.",
  "performedAt": "2026-06-20"
}
```

Tipos:

```txt
INITIAL  Vistoria inicial
FINAL    Vistoria final
```

---

## 20. Ordens de compra

Caso o módulo esteja habilitado no projeto, as rotas seguem este padrão:

```txt
GET    /api/purchase-orders
GET    /api/purchase-orders/:id
POST   /api/purchase-orders
PUT    /api/purchase-orders/:id
DELETE /api/purchase-orders/:id
```

Criar O.C.:

```json
{
  "obraId": "ID_DA_OBRA",
  "number": "OC-0001",
  "payerCnpj": "12345678000199",
  "supplier": "Fornecedor de Materiais LTDA",
  "description": "Compra de tintas e materiais",
  "totalValue": 2500,
  "status": "ISSUED",
  "issuedAt": "2026-06-26"
}
```

Status:

```txt
DRAFT
ISSUED
APPROVED
CANCELED
```

---

## 21. Dashboard

Caso o módulo esteja habilitado no projeto:

```txt
GET /api/dashboard
```

Resposta esperada:

```json
{
  "contracts": {
    "total": 10,
    "active": 5,
    "waitingSignature": 1,
    "signed": 4,
    "expiring": 1,
    "totalValue": 85000
  },
  "obras": {
    "total": 4,
    "inProgress": 2,
    "expectedBudget": 50000,
    "realizedBudget": 32000,
    "budgetUsagePercent": 64
  },
  "purchaseOrders": {
    "total": 3,
    "totalValue": 12000
  }
}
```

---

## 22. Relatórios

Caso o módulo esteja habilitado no projeto:

```txt
GET /api/reports/obras
GET /api/reports/obras/:id
```

O relatório de obra deve consolidar:

- dados da empresa;
- dados da obra;
- contrato vinculado;
- progresso das etapas;
- orçamento previsto e realizado;
- custos por categoria;
- vistorias inicial/final;
- ordens de compra;
- uploads.

---

## 23. Serviços externos

### Resend

Usado para enviar links de assinatura por e-mail.

Arquivo:

```txt
src/modules/services/email.service.js
```

Para ambiente de testes, pode ser usado:

```env
RESEND_EMAIL_FROM="Contratos <onboarding@resend.dev>"
```

Em produção, use um domínio verificado na Resend.

### W-API

Usada para envio de link de assinatura via WhatsApp.

Arquivo:

```txt
src/modules/services/whatsapp.service.js
```

Body enviado para W-API:

```json
{
  "phone": "5562999999999",
  "message": "Mensagem com link de assinatura",
  "messageId": "ID_DA_SOLICITACAO",
  "delayMessage": 0
}
```

---

## 24. Logs de auditoria

A tabela `audit_logs` guarda ações importantes:

- criação de contrato;
- atualização de contrato;
- envio para assinatura;
- assinatura concluída;
- criação de obra;
- lançamento de custos;
- criação de vistorias;
- ações de relatório, quando aplicável.

Isso ajuda na rastreabilidade do sistema.

---

## 25. Fluxo principal da aplicação

Fluxo recomendado para demonstração:

1. Criar conta e empresa.
2. Criar contrato.
3. Enviar contrato para assinatura.
4. Abrir link público da assinatura.
5. Assinar contrato.
6. Ver contrato como assinado/arquivado.
7. Criar obra vinculada ao contrato.
8. Concluir etapas da obra.
9. Lançar custos.
10. Registrar vistoria inicial/final.
11. Criar ordem de compra, se o módulo estiver habilitado.
12. Visualizar dashboard e relatórios, se habilitados.

---

## 26. Problemas comuns

### `Missing script: dev`

Você está fora da pasta do projeto ou o `package.json` não tem o script.

Entre na pasta correta:

```bash
cd contratos-orcamentos-api
npm run dev
```

### Erro de conexão com PostgreSQL

Confira:

- `DATABASE_URL` no `.env`;
- banco criado;
- usuário e senha corretos;
- SSL quando usar banco remoto.

### Erro de JWT

Confira se existe:

```env
JWT_SECRET="alguma_chave"
```

Depois faça login novamente para gerar um novo token.

### Empresa não autorizada

Se receber:

```txt
Usuário sem acesso a esta empresa.
```

Confira se o frontend está enviando o header:

```txt
x-company-id
```

E se existe vínculo em `company_members`.

### E-mail não enviado

Confira:

- `RESEND_API_KEY`;
- `RESEND_EMAIL_FROM`;
- domínio validado na Resend, se não estiver usando `onboarding@resend.dev`.

### WhatsApp não enviado

Confira:

- `WAPI_BASE_URL`;
- `WAPI_TOKEN`;
- `WAPI_INSTANCE_ID`;
- número com DDI, exemplo: `5562999999999`.

---

## 27. Checklist para entrega

Antes de entregar o projeto:

- [ ] `.env.example` preenchido sem segredos reais;
- [ ] `.env` fora do repositório;
- [ ] migrations Prisma funcionando;
- [ ] `npm install` roda sem erro;
- [ ] `npm run dev` inicia a API;
- [ ] cadastro e login funcionando;
- [ ] contrato criado com status `DRAFT`;
- [ ] envio para assinatura funcionando;
- [ ] assinatura pública funcionando;
- [ ] obra vinculada ao contrato funcionando;
- [ ] custos e vistorias funcionando;
- [ ] README atualizado.

---

## 28. Observações de implementação

O projeto foi estruturado para manter clareza e velocidade de entrega. A separação por módulos facilita mostrar a lógica durante a avaliação, sem deixar o código difícil de navegar.

Pontos fortes da arquitetura:

- isolamento por empresa;
- autenticação via JWT;
- contratos com fluxo de assinatura;
- múltiplos assinantes por contrato;
- assinatura pública por link;
- arquivamento automático após todas as assinaturas;
- obras vinculadas a contratos;
- custos, etapas e vistorias organizados por obra;
- logs de auditoria para rastreabilidade.
