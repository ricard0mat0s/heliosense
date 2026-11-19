# HelioSense — Gestão Residencial de Energia Solar

Aplicação web full-stack para monitoramento residencial de energia solar (**React + TypeScript + Tailwind CSS + Recharts** no frontend, **Python + FastAPI + PyMySQL** no backend e **MySQL** no banco de dados).

## Estrutura do Projeto

- `backend/` — API REST em FastAPI com padrão Repository e suporte a dois modos via `.env`:
  - `DATA_SOURCE=mock`: modo de preview em memória com dados residenciais demonstrativos, espelhando exatamente as restrições (`UNIQUE`, `ON DELETE RESTRICT`), views, procedure e trigger.
  - `DATA_SOURCE=mysql`: conexão direta com seu banco MySQL via SQL parametrizado (`PyMySQL`), consumindo suas tabelas, `vw_energia_painel_horaria`, `vw_energia_painel_diaria`, `sp_resumo_energia_casa` e a trigger de alertas.
- `frontend/` — SPA React (Vite + TypeScript + Tailwind CSS + Recharts) em português brasileiro (`pt-BR`).
- `docs/db-contract.md` — Contrato exato de nomes de tabelas, colunas, views, stored procedure e trigger esperados pela API (sem scripts DDL).

## Como Executar

### 1. Backend (FastAPI)

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

- Documentação interativa Swagger: `http://127.0.0.1:8000/docs`
- Para executar os testes automatizados:

```bash
cd backend
uv run pytest
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

- Aplicação web: `http://localhost:5173`
- Em modo `mock`, utilize o botão **Preencher** na tela de login (`demo@heliosense.com.br` / `HelioSense@2026`) ou crie um novo cadastro residencial.

## Alternando para o Banco MySQL Real

Quando seus scripts DDL, Views, Trigger e Stored Procedure estiverem criados no MySQL Workbench conforme [`docs/db-contract.md`](docs/db-contract.md):

1. Edite `backend/.env`:
   ```env
   DATA_SOURCE=mysql
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=seu_usuario
   MYSQL_PASSWORD=sua_senha
   MYSQL_DATABASE=heliosense
   ```
2. Reinicie o servidor FastAPI (`uvicorn`). O indicador **Fonte de Dados** no menu lateral passará automaticamente para **MYSQL**.
