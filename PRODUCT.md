# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Proprietários de imóveis residenciais equipados com painéis solares que acompanham a geração de energia de uma ou mais residências, verificam o desempenho individual de cada painel e identificam anomalias de produção. Em apresentações do projeto, o produto também é demonstrado ao vivo em notebook e projetor, devendo se apresentar como um produto residencial realista para o morador.

## Product Purpose

O **HelioSense** é uma aplicação web de gestão residencial de energia solar. Permite que o proprietário cadastre suas residências e painéis solares, acompanhe a geração consolidada, horária e diária em kWh, simule ou registre leituras de produção, receba e resolva alertas automáticos de anomalias e consulte o histórico de segurança e auditoria da conta.

O sucesso do produto significa oferecer ao morador clareza imediata sobre quanto cada residência e painel está gerando e se existe algum problema operacional que exija atenção, mantendo toda a integridade de dados e regras de detecção nos bastidores.

## Positioning

Monitoramento solar residencial com visibilidade por painel individual, combinado a um simulador integrado de leituras (horárias e de dia completo) e detecção automática de anomalias baseadas nos limites físicos de cada equipamento (geração zero em horário diurno e produção acima da capacidade nominal), apresentado em linguagem de produto para o morador — sem expor detalhes internos de banco de dados ou SQL na interface.

## Operating Context

- **Ambiente de uso:** aplicação web responsiva utilizada principalmente em notebook/projetor durante demonstrações e em navegadores desktop e mobile no uso cotidiano.
- **Idioma e contexto regional:** português brasileiro (`pt-BR`), com unidades em kWh e regras de domínio brasileiras (CPF, CEP e estrutura de endereço nacional).
- **Fluxo de dados:** um proprietário gerencia múltiplas residências (`casas`) e múltiplos painéis solares (`paineis`) associados a um catálogo de modelos (`modelos_paineis`), operando sobre dados demonstrativos em memória (`mock`) ou banco relacional MySQL (`mysql`) de forma transparente para a interface.

## Capabilities and Constraints

### Funcionalidades confirmadas na aplicação
- Autenticação e ciclo de vida da conta: login, cadastro residencial, edição de perfil e desativação de conta (soft delete).
- Painel geral consolidado com totais de geração por residência e por painel individual.
- Gestão de residências e gestão de painéis solares (com catálogo de modelos e status `ativo`, `manutencao` e `inativo`).
- Detalhe do painel com gráficos de geração horária e diária, alertas do painel e **simulador interativo de leituras** (leitura horária avulsa e simulação de dia completo com injeção opcional de anomalias).
- Central de alertas automáticos para dois tipos de anomalia — `ZERO_DIURNO` (0 kWh entre 08:00 e 18:00) e `ACIMA_CAPACIDADE` (geração acima de `potencia_max_w / 1000` kWh) — com fluxo de resolução.
- Histórico de logs de auditoria das ações da conta.

### Restrições duradouras
- **Não expor detalhes internos de SQL/banco na interface:** nomes de tabelas, views, stored procedures (`sp_resumo_energia_casa`), menções a triggers e rodapés de seminário acadêmico não pertencem à experiência voltada ao morador.
- **Preservar o simulador de leituras e injeção de anomalias** (`ZERO_DIURNO` e `ACIMA_CAPACIDADE`) no detalhe do painel.
- **Preservar o contrato de API e banco de dados** definido em `docs/db-contract.md` (incluindo integridade referencial `ON DELETE RESTRICT`, chaves únicas, normalização de CPF/CEP, views horária/diária, stored procedure de resumo e trigger de alertas) e a compatibilidade com os modos `DATA_SOURCE=mock` e `DATA_SOURCE=mysql`.

### Decisões em aberto
- Manter, ocultar ou condicionar ao modo de demonstração o indicador de fonte de dados (`MOCK`/`MYSQL`) na navegação lateral e o bloco de credenciais demonstrativas na tela de login.

## Brand Commitments

- **Nome:** HelioSense (`HelioSense — Gestão Residencial de Energia Solar`).
- **Idioma e voz:** português brasileiro (`pt-BR`), com linguagem voltada ao proprietário residencial (evitando jargão de banco de dados ou tom acadêmico na interface).

## Evidence on Hand

- **Aplicação funcional:** frontend em `frontend/` (React, TypeScript, Vite, Tailwind CSS, Recharts) e backend em `backend/` (Python, FastAPI, PyMySQL), com suíte de testes em `backend/tests/test_api.py`.
- **Dataset demonstrativo em memória:** `backend/app/repositories/mock_repo.py` com conta de demonstração (`demo@heliosense.com.br`), 2 residências, 5 painéis solares e 7 dias de leituras horárias com alertas de exemplo.
- **Contrato técnico de dados:** `docs/db-contract.md`.
- **Ausências (não fabricar em trabalhos futuros):** não há depoimentos reais de clientes, cálculos reais de tarifa ou economia na conta de luz em reais, integração ao vivo com inversores/hardware IoT (leituras vêm do seed ou do simulador) nem certificações ou métricas comerciais reais.

## Product Principles

1. **Linguagem do morador em primeiro lugar:** toda tela fala sobre residências, painéis, geração e alertas — nunca sobre tabelas, triggers, views ou procedures.
2. **Rastreabilidade até o painel individual:** consolidar a visão por residência, sempre permitindo descer ao histórico horário/diário e aos alertas de cada painel.
3. **Detecção de anomalias demonstrável:** manter o simulador de leituras e a injeção de falhas (`ZERO_DIURNO` e `ACIMA_CAPACIDADE`) acessíveis e compreensíveis para testar e validar alertas ao vivo.
4. **Clareza pronta para demonstração e uso diário:** priorizar leitura rápida em telas de notebook e projetor sem perder usabilidade em dispositivos móveis.
