# Contrato de Banco de Dados — HelioSense (MySQL ↔ FastAPI)

Este documento define o contrato exato de nomes, colunas, tipos, visões, procedure e trigger que o backend **FastAPI** espera quando configurado em modo MySQL (`DATA_SOURCE=mysql`).

> **Nota:** Este arquivo documenta apenas a interface esperada pela aplicação. Nenhum script DDL (`CREATE TABLE`, `CREATE VIEW`, `CREATE TRIGGER`, `CREATE PROCEDURE`) está incluído aqui para que você implemente e teste todo o SQL no MySQL Workbench.

---

## 1. Convenções Gerais

- **Nomes de tabelas, colunas, views e procedures:** todos em **minúsculas** (`snake_case`, sem acentos) para compatibilidade entre Windows e Linux.
- **Charset recomendado:** `utf8mb4` / `utf8mb4_unicode_ci`.
- **Engine recomendada:** `InnoDB` (obrigatória para integridade referencial `FOREIGN KEY` e transações).
- **CPF e CEP:** armazenados **somente com dígitos** (`CHAR(11)` para `cpf`, `CHAR(8)` para `cep`). A API normaliza automaticamente máscaras vindas do frontend.
- **Intervalo das leituras (`registrado_em`):** tipo `DATETIME` (sem deslocamento de fuso horário), sempre fechado na hora cheia (`YYYY-MM-DD HH:00:00`), representando a energia gerada na hora que termina naquele horário (ex.: `2026-11-19 13:00:00` = energia produzida entre `12:00` e `13:00`).

---

## 2. Tabelas Esperadas

### `usuarios`
| Coluna | Tipo MySQL | Restrições | Uso no FastAPI |
| :--- | :--- | :--- | :--- |
| `cpf` | `CHAR(11)` | `PK`, `NOT NULL` | Identificador interno (presente no token JWT `sub`, nunca na URL) |
| `nome` | `VARCHAR(120)` | `NOT NULL` | Exibição no perfil e cabeçalho |
| `data_nascimento` | `DATE` | `NOT NULL` | Cadastro e edição de perfil |
| `email` | `VARCHAR(150)` | `NOT NULL`, `UNIQUE` | Identificador de login |
| `senha_hash` | `VARCHAR(255)` | `NOT NULL` | Hash `bcrypt` gerado/verificado pelo FastAPI |
| `telefone` | `VARCHAR(20)` | `NOT NULL` | Contato residencial |
| `logradouro` | `VARCHAR(150)` | `NOT NULL` | Endereço de contato |
| `numero` | `VARCHAR(10)` | `NOT NULL` | Número do endereço |
| `complemento` | `VARCHAR(60)` | `NULL` | Opcional |
| `bairro` | `VARCHAR(80)` | `NOT NULL` | Bairro |
| `cidade` | `VARCHAR(80)` | `NOT NULL` | Cidade |
| `uf` | `CHAR(2)` | `NOT NULL` | Sigla do estado (ex.: `MG`) |
| `cep` | `CHAR(8)` | `NOT NULL` | Somente 8 dígitos |
| `ativo` | `BOOLEAN` | `NOT NULL`, `DEFAULT TRUE` | Soft delete (`FALSE` bloqueia login) |
| `criado_em` | `DATETIME` | `NOT NULL` | Timestamp de criação (`DEFAULT CURRENT_TIMESTAMP` ou enviado pela API) |

### `casas`
| Coluna | Tipo MySQL | Restrições | Observações |
| :--- | :--- | :--- | :--- |
| `id_casa` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | |
| `cpf_proprietario` | `CHAR(11)` | `FK -> usuarios(cpf)`, `NOT NULL` | `ON DELETE RESTRICT ON UPDATE CASCADE` |
| `nome` | `VARCHAR(80)` | `NULL` | Apelido (ex.: `Casa Principal`) |
| `logradouro` | `VARCHAR(150)` | `NOT NULL` | |
| `numero` | `VARCHAR(10)` | `NOT NULL` | |
| `complemento` | `VARCHAR(60)` | `NULL` | |
| `bairro` | `VARCHAR(80)` | `NOT NULL` | |
| `cidade` | `VARCHAR(80)` | `NOT NULL` | |
| `uf` | `CHAR(2)` | `NOT NULL` | |
| `cep` | `CHAR(8)` | `NOT NULL` | |
| `criado_em` | `DATETIME` | `NOT NULL` | |

### `modelos_paineis`
| Coluna | Tipo MySQL | Restrições | Observações |
| :--- | :--- | :--- | :--- |
| `id_modelo` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | |
| `marca` | `VARCHAR(80)` | `NOT NULL` | `UNIQUE(marca, nome_modelo)` |
| `nome_modelo` | `VARCHAR(80)` | `NOT NULL` | |
| `potencia_max_w` | `INT` | `NOT NULL` | Usada pela trigger (`potencia_max_w / 1000.0` kWh em 1h) |
| `eficiencia_pct` | `DECIMAL(5,2)` | `NULL` | Ex.: `21.50` |

### `paineis`
| Coluna | Tipo MySQL | Restrições | Observações |
| :--- | :--- | :--- | :--- |
| `id_painel` | `INT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | |
| `id_casa` | `INT` | `FK -> casas(id_casa)`, `NOT NULL` | `ON DELETE RESTRICT` |
| `id_modelo` | `INT` | `FK -> modelos_paineis(id_modelo)`, `NOT NULL` | `ON DELETE RESTRICT` |
| `numero_serie` | `VARCHAR(60)` | `NOT NULL`, `UNIQUE` | Identificador físico do painel |
| `data_instalacao` | `DATE` | `NOT NULL` | |
| `status` | `ENUM('ativo','manutencao','inativo')` | `NOT NULL` | Padrão `'ativo'` |

### `leituras_energia`
| Coluna | Tipo MySQL | Restrições | Observações |
| :--- | :--- | :--- | :--- |
| `id_leitura` | `BIGINT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | |
| `id_painel` | `INT` | `FK -> paineis(id_painel)`, `NOT NULL` | `ON DELETE RESTRICT` |
| `registrado_em` | `DATETIME` | `NOT NULL` | `UNIQUE(id_painel, registrado_em)` |
| `energia_kwh` | `DECIMAL(10,4)` | `NOT NULL`, `CHECK (energia_kwh >= 0)` | Produção na hora |

### `alertas`
| Coluna | Tipo MySQL | Restrições | Observações |
| :--- | :--- | :--- | :--- |
| `id_alerta` | `BIGINT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | |
| `id_painel` | `INT` | `FK -> paineis(id_painel)`, `NOT NULL` | |
| `id_leitura` | `BIGINT` | `FK -> leituras_energia(id_leitura)`, `NOT NULL` | Todo alerta rastreia a leitura geradora |
| `tipo_alerta` | `ENUM('ZERO_DIURNO','ACIMA_CAPACIDADE')` | `NOT NULL` | |
| `mensagem` | `VARCHAR(255)` | `NOT NULL` | |
| `resolvido` | `BOOLEAN` | `NOT NULL`, `DEFAULT FALSE` | Atualizado pelo FastAPI via `PATCH /api/alertas/{id}/resolver` |
| `criado_em` | `DATETIME` | `NOT NULL` | |
| `resolvido_em` | `DATETIME` | `NULL` | Preenchido ao resolver |

### `logs_auditoria`
| Coluna | Tipo MySQL | Restrições | Observações |
| :--- | :--- | :--- | :--- |
| `id_log` | `BIGINT` | `PK`, `AUTO_INCREMENT`, `NOT NULL` | |
| `cpf_usuario` | `CHAR(11)` | `FK -> usuarios(cpf)`, `NOT NULL` | `ON DELETE RESTRICT ON UPDATE CASCADE` |
| `acao` | `VARCHAR(60)` | `NOT NULL` | Ex.: `LOGIN`, `LOGIN_FALHA`, `CADASTRO`, `CRIAR_CASA`, `ATUALIZAR_PAINEL`, `REGISTRAR_LEITURA`, `RESOLVER_ALERTA`, `DESATIVAR_CONTA` |
| `tabela_alvo` | `VARCHAR(60)` | `NULL` | Ex.: `casas`, `paineis`, `leituras_energia`, `alertas`, `usuarios` |
| `id_alvo` | `VARCHAR(60)` | `NULL` | ID do registro afetado em texto |
| `detalhes` | `TEXT` | `NULL` | JSON serializado pela API |
| `endereco_ip` | `VARCHAR(45)` | `NULL` | IPv4 ou IPv6 da requisição |
| `criado_em` | `DATETIME` | `NOT NULL` | |

---

## 3. Views Esperadas

### 3.1 `vw_energia_painel_horaria`
Consultada por `GET /api/paineis/{id_painel}/leituras/horaria` para plotar o gráfico horário do painel.

**Colunas obrigatórias no `SELECT` da view:**
- `id_leitura`
- `id_painel`
- `numero_serie`
- `id_casa`
- `nome_casa` (alias de `casas.nome`)
- `cpf_proprietario`
- `registrado_em`
- `energia_kwh`
- `potencia_max_w` (de `modelos_paineis`)

### 3.2 `vw_energia_painel_diaria`
Consultada por `GET /api/paineis/{id_painel}/leituras/diaria` para plotar o gráfico diário acumulado por painel.

**Colunas obrigatórias no `SELECT` da view:**
- `id_painel`
- `numero_serie`
- `id_casa`
- `nome_casa` (alias de `casas.nome`)
- `cpf_proprietario`
- `data_leitura` (`DATE(registrado_em)`)
- `total_leituras` (`COUNT(id_leitura)`)
- `energia_total_kwh` (`SUM(energia_kwh)`)

---

## 4. Stored Procedure Esperada

### `sp_resumo_energia_casa(IN p_cpf_usuario CHAR(11))`
Chamada por `GET /api/dashboard/resumo` via `CALL sp_resumo_energia_casa(%s)`.

Deve retornar **exatamente 2 result sets** (lidos via `cursor.fetchall()` + `cursor.nextset()` no `PyMySQL`):

1. **1º Result Set — Resumo por Casa** (use `LEFT JOIN` para casas sem painéis ainda aparecerem com `0`):
   - `id_casa`
   - `nome`
   - `qtd_paineis`
   - `energia_total_casa` (use `COALESCE(SUM(...), 0)`)

2. **2º Result Set — Detalhamento por Painel** (use `LEFT JOIN` com `leituras_energia` para painéis sem leitura ainda aparecerem com `0`):
   - `id_casa`
   - `id_painel`
   - `numero_serie`
   - `energia_total_painel` (use `COALESCE(SUM(...), 0)`)

---

## 5. Trigger Esperada (em `leituras_energia`)

Quando o FastAPI executa `POST /api/paineis/{id_painel}/leituras` em modo MySQL:
1. O backend faz **apenas** `INSERT INTO leituras_energia (id_painel, registrado_em, energia_kwh) VALUES (...)`.
2. Sua trigger `AFTER INSERT` em `leituras_energia` deve verificar:
   - **`ZERO_DIURNO`:** se `NEW.energia_kwh = 0` e `HOUR(NEW.registrado_em) BETWEEN 8 AND 18` → insere linha em `alertas`.
   - **`ACIMA_CAPACIDADE`:** se `NEW.energia_kwh > (potencia_max_w / 1000.0)` (buscando `potencia_max_w` em `paineis` + `modelos_paineis`) → insere linha em `alertas`.
3. Em seguida, o FastAPI consulta `SELECT ... FROM alertas WHERE id_leitura = %s` para devolver à interface React o alerta criado automaticamente pelo MySQL.

---

## 6. Códigos de Erro MySQL Tratados pela API

O backend traduz erros de integridade do MySQL em respostas HTTP claras (PT-BR):
- **`1062` (Duplicate entry):** retorna `409 Conflict` (ex.: e-mail/CPF duplicado, `numero_serie` duplicado, `(marca, nome_modelo)` duplicado, ou leitura horária duplicada em `(id_painel, registrado_em)`).
- **`1451` (Cannot delete or update a parent row — `ON DELETE RESTRICT`):** retorna `409 Conflict` explicando que o registro possui dependentes vinculados (ex.: tentar excluir uma casa que ainda possui painéis, ou painel que possui leituras).
- **`1452` (Cannot add or update a child row — FK inválida):** retorna `400 Bad Request`.
