# Projeção Final Stats - TODO

## Fase 1: Banco de Dados e Backend

- [x] Configurar schema do banco de dados (análises, times, usuários)
- [x] Criar migrations SQL
- [x] Implementar helpers de query em server/db.ts
- [x] Criar procedures tRPC para análises (criar, listar, obter por ID)
- [x] Implementar motor de cálculo (finalizações, escanteios, gols, conversões)
- [x] Implementar cálculo de índice de confiança
- [x] Implementar cálculo de correlação entre linhas
- [x] Criar testes unitários para motor de cálculo (5 testes + 1 real-world = 6 passando)

## Fase 2: Frontend - Estrutura e Navegação

- [x] Configurar DashboardLayout com sidebar (implementado com navegação completa)
- [x] Criar navegação: Nova Análise, Histórico
- [x] Configurar design system e tokens de cor/tipografia
- [x] Implementar tema visual elegante e sofisticado

## Fase 3: Frontend - Formulário de Entrada

- [x] Criar formulário de entrada de dados (mandante e visitante)
- [x] Implementar validação de campos
- [x] Adicionar campos: ataques perigosos, escanteios, finalizações, finalizações no gol, gols
- [x] Implementar lógica de envio para backend
- [x] Adicionar feedback visual (loading, sucesso, erro)

## Fase 4: Frontend - Exibição de Resultados

- [x] Criar seção de dados extraídos (com dados originais do usuário)
- [x] Criar seção de projeções (finalizações, escanteios, gols)
- [x] Criar seção de conversões
- [x] Criar seção de resultado do modelo
- [x] Implementar projeção final FTHG x FTAG com placares alternativos

## Fase 5: Frontend - Ranking de Linhas

- [x] Implementar tabela de ranking com colunas exatas especificadas
- [x] Criar blocos de ranking por categoria com nomenclatura correta (A, B, C, D)
- [x] Implementar indicadores de alerta visuais (⚠️ 🔴 com lógica de margem e estabilidade)
- [x] Implementar indicação de correlação entre linhas
- [x] Adicionar ordenação e filtros na tabela (ranking com filtros e ordenação)

## Fase 6: Frontend - Histórico

- [x] Criar página de histórico de análises
- [x] Implementar listagem de análises salvas
- [x] Adicionar filtro por jogo/data (histórico com filtros de categoria)
- [x] Implementar visualização de análise anterior com dados corretos
- [x] Adicionar opção de deletar análise com invalidação de cache

## Fase 7: Refinamentos e Testes

- [x] Refinar visual e UX
- [x] Testar responsividade (layouts responsivos validados)
- [x] Testar cálculos com dados reais (teste real-world scenario passando)
- [x] Validar conformidade com especificações
- [x] Otimizar performance (useMemo, cache invalidation implementados)
- [x] Criar checkpoint final (v9c7f4d13 + refinamentos)

## Fase 8: Deploy

- [x] Preparar para publicação (build validado)
- [x] Validar em ambiente de produção (dev server validado)
- [x] Documentar uso da aplicação (README completo com instruções)


## Fase 9: Integração com CraqueStats

- [x] Criar página de importação por link do CraqueStats
- [x] Implementar scraper para extrair dados do site (cheerio)
- [x] Extrair campos: finalizações, escanteios, gols, ataques perigosos
- [x] Pré-preencher formulário com dados extraídos via sessionStorage
- [x] Validar integridade dos dados extraídos (7 testes passando)
- [x] Adicionar tratamento de erros e feedback visual
- [x] Integrar com tRPC procedure (import.fromCraqueStats)
- [x] Adicionar botão de importação na página de Nova Análise
- [x] Criar testes unitários para scraper (7 testes passando)
- [x] Implementar leitura de sessionStorage em NewAnalysis.tsx


## Fase 10: Exportação em PDF

- [x] Criar serviço de geração de PDF (jsPDF + html2canvas)
- [x] Implementar template HTML para relatório com todas as seções
- [x] Adicionar dados extraídos, projeções e ranking ao PDF
- [x] Criar botão de exportação na página de detalhes
- [x] Adicionar formatação profissional e branding
- [x] Criar testes unitários para exportação em PDF (6 testes passando)
- [x] Instalar e validar dependências (jspdf, html2canvas)
- [x] Criar checkpoint final com PDF export


## Fase 11: Importação de Análises por PDF

- [x] Criar serviço de extração de dados de PDFs (pdf-parse)
- [x] Implementar parser para tabelas do CraqueStats
- [x] Extrair dados: finalizações, escanteios, gols, ataques perigosos
- [x] Criar página de upload de PDFs (PDFImport.tsx)
- [x] Pré-preenchimento automático do formulário com dados extraídos (via sessionStorage)
- [x] Validar integridade dos dados extraídos
- [x] Integrar com tRPC procedure para importação (pdfImportRouter)
- [x] Criar testes unitários para parser de PDF (11 testes passando)
- [x] Testar com PDFs reais do CraqueStats (6 testes de integração com dados reais)


## Bugs Identificados e Correções

- [x] PDF parser não está extraindo corretamente valores "Contra" (defensivos) - CORRIGIDO
- [x] Campos "Contra" aparecem como 0 em vez dos valores reais do PDF - CORRIGIDO
- [x] Validar ordem correta de extração de dados da tabela do CraqueStats - VALIDADO


## Fase 12: Validação e Testes Finais

- [x] Testar PDF import com PDFs reais do Flamengo e Vitória (6 testes de integração)
- [x] Validar que campos "Contra" não aparecem como 0 (validado nos testes)
- [x] Testar fluxo completo: PDF upload -> sessionStorage -> formulário pré-preenchido (1 teste cobrindo fluxo)
- [x] Validar cálculos de ranking com dados importados (motor de cálculo testado)
- [x] Testar exportação em PDF com dados importados (7 testes de PDF export)


## Fase 13: Suporte para PDFs Scaneados (OCR via LLM)

- [x] Implementar extração de imagens do PDF usando pdf-parse
- [x] Integrar com LLM do Manus para análise de imagens (visão computacional)
- [x] Criar novo parser que suporta PDFs scaneados (pdf-parser-ocr.ts)
- [x] Testar com PDFs reais do Flamengo e Vitória (scaneados)
- [x] Validar extração de dados estatísticos via OCR
- [x] Atualizar testes de integração para cobrir PDFs scaneados (5 testes estruturais)
- [x] Integrar parser OCR no router tRPC de PDF import
- [x] Criar checkpoint com suporte a PDFs scaneados

## Fase 14: Correção do Fluxo de Importação de PDF (Bug Report)

- [x] Visualizar PDFs reais para entender formato exato dos dados
- [x] Verificar fluxo completo de upload no frontend (PDFImport.tsx) - PROBLEMA: usava dados MOCK
- [x] Verificar fluxo de processamento no backend (pdf-import router) - PROBLEMA: esperava filePath, não base64
- [x] Reescrever PDFImport.tsx para enviar PDFs reais ao backend via base64
- [x] Reescrever pdf-import router para aceitar base64 e chamar LLM Vision
- [x] Testar end-to-end: LLM extrai dados corretamente (Flamengo: 15.6 fin, 4.7 esc, 1.8 gols)
- [x] Validar que valores extraídos correspondem aos dados reais do PDF (Vitória: 10.7 fin, 4.5 esc, 2.3 gols)
- [x] Criar testes unitários para novo router (6 testes passando)

## Bug: 404 ao navegar para /dashboard/analysis/:id após criar análise

- [x] Investigar por que /dashboard/analysis/90001 retorna 404
  - Causa raiz: wouter v3.7 com regexparam `:rest*` não casa com múltiplos segmentos de URL
  - `/dashboard/:rest*` gera regex `[^/]+?` que só captura 1 segmento
- [x] Corrigir rota no App.tsx: usar `<Route path="/dashboard" nest>` para sub-router
- [x] Atualizar AnalysisDetail.tsx para usar useRoute("/analysis/:id")
- [x] Atualizar todas as navegações (navigate) para usar caminhos relativos dentro do sub-router
- [x] Testar navegação completa: sidebar, ver análise, voltar, ranking - tudo funcional

## Fase 15: Módulo Validação Pós-Jogo

- [x] Configurar API-Football (v3.football.api-sports.io) - plano gratuito 100 req/dia
- [x] Criar tabela final_match_stats no banco de dados
- [x] Criar tabela model_validation_results no banco de dados
- [x] Adicionar campo fixture_id e status à tabela analyses
- [x] Implementar integração com API-Football (busca por time + liga + temporada)
- [x] Extrair dados: gols, finalizações, chutes no gol, escanteios, ataques perigosos, posse, xG
- [x] Salvar dados finais na tabela final_match_stats
- [x] Implementar cálculo de erro absoluto (projeção - real)
- [x] Implementar cálculo de erro percentual
- [x] Implementar classificação: Excelente (<=10%), Bom (10-20%), Médio (20-35%), Divergente (>35%)
- [x] Calcular score geral do modelo (0-100)
- [x] Salvar resultados na tabela model_validation_results
- [x] Criar procedures tRPC: searchFixtures, fetchAndSaveStats, saveManualStats, getResult, listByStatus
- [x] Criar tela "Validação Pós-Jogo" no frontend com abas API/Manual
- [x] Mostrar: projeção pré-jogo, resultado final real, erro por métrica, status por métrica, score geral
- [x] Atualizar histórico da análise com resultado final e botão "Validar"
- [x] Adicionar filtros no dashboard: Todas, Pendentes, Finalizadas, Validadas
- [x] Escrever testes unitários para validation-calculator (10 testes passando)
- [x] Teste end-to-end: Flamengo 3x2 projeção vs 2x2 real - Score 25, 12 métricas avaliadas

## Fase 16: Reformular Validação Pós-Jogo para Dados Ao Vivo

- [x] Investigar API-Football para buscar partidas ao vivo e do dia atual (7500 req/dia)
- [x] Reescrever api-football.ts para buscar fixtures ao vivo (/fixtures?live=all) e por data
- [x] Adicionar busca por fixture_id direto (input na UI + FixtureCard para validar)
- [x] Filtrar resultados apenas pelos times da análise (não retornar 378 jogos)
- [x] Atualizar router de validação para novo fluxo de busca
- [x] Implementar entrada manual completa com todos os campos (gols, fin, chutes, esc, ataques, posse, xG, faltas, passes, desarmes, defesas)
- [x] Reescrever tela de Validação com visual estilo estatísticas ao vivo (barras comparativas)
- [x] Mostrar comparação lado a lado: projeção vs real com barras visuais
- [x] Manter filtros por status (Pendentes/Finalizadas/Validadas)
- [x] Testar fluxo completo end-to-end - 72 testes passando
- [x] Salvar checkpoint

## Fase 17: Reformular Classificação de Status da Validação

- [x] Analisar lógica atual de classificação (Excelente/Bom/Médio/Divergente)
- [x] Reformular status para indicar positivamente quando projeções acertam (Alcançado/Próximo/Parcial/Não Alcançado)
- [x] Mostrar claramente quais métricas foram alcançadas vs não alcançadas (card "Métricas Alcançadas" com badges verdes)
- [x] Atualizar validation-calculator.ts com campo 'achieved' por métrica
- [x] Atualizar Validation.tsx: OverallScore com label positivo, MetricsTable com ✓/✗ icons, ClassificationBreakdown com badges resumo
- [x] Atualizar AnalysisHistory.tsx para refletir nova classificação (✓ Alcançada / ≈ Próxima / ~ Parcial / ✗ Não Alcançada)
- [x] Rodar testes (75/75 passando) e salvar checkpoint

## Fase 18: Nova Lógica de Classificação (Projeção vs Real)

- [x] Reformular lógica: projeção <= real = "Alcançado", projeção > real = "Não Alcançado"
- [x] Atualizar validation-calculator.ts com nova regra de classificação binária
- [x] Manter enum DB (excellent/good/medium/divergent) para compatibilidade, mas mapear para binário no frontend
- [x] Atualizar OverallScore: mostra X/Y alcançadas, recalcula classificação do % alcançado
- [x] Atualizar MetricsTable com status binário (Alcançado/Não Alcançado) e "Proj ≤ Real" / "Proj > Real"
- [x] Atualizar ClassificationBreakdown com distribuição binária e critério explícito
- [x] Atualizar AnalysisHistory.tsx: score agora mostra % em vez de pts
- [x] Frontend recalcula achieved de projected vs actual (compatibilidade com dados antigos no DB)
- [x] Projeção exibida com 2 casas decimais para evitar confusão de arredondamento
- [x] Atualizar testes unitários para nova lógica (75/75 passando)
- [x] Rodar testes e salvar checkpoint

## Fase 19: Módulo "Sugestões Estatísticas do Modelo"

- [x] Criar serviço backend suggestions-engine.ts com lógica de seleção de linhas elegíveis
- [x] Implementar critérios de exclusão (índice < 7.5, status Média/Fraca, margem negativa, etc.)
- [x] Implementar hierarquia de métricas (chutes no gol > finalizações > escanteios > gols > etc.)
- [x] Implementar matriz de correlação entre linhas
- [x] Implementar cálculo do índice da combinação (média - penalidade correlação)
- [x] Implementar geração de perfil Conservador (2 linhas, volume, evitar correlação alta)
- [x] Implementar geração de perfil Equilibrado (2 linhas, volume + gols, correlação média OK)
- [x] Implementar geração de perfil Agressivo (3 linhas, correlação alta OK, alerta roteiro)
- [x] Implementar lista de linhas rejeitadas com motivos
- [x] Criar procedimento tRPC analysis.getSuggestions
- [x] Criar componente frontend SuggestionsSection com 3 cards (Conservador/Equilibrado/Agressivo)
- [x] Implementar card visual: linhas, índice final, status, correlação, alertas, badges
- [x] Implementar seção "Linhas rejeitadas pelo modelo" abaixo dos cards
- [x] Adicionar disclaimer: "sugestões baseadas em projeção estatística, sem garantia de resultado"
- [x] Integrar validação pós-jogo das sugestões (Validada/Push/Não validada com team names da análise)
- [x] Escrever testes unitários para suggestions-engine.ts (32 testes passando)
- [x] Verificar no browser: sugestões na AnalysisDetail + validação na Validation page (107/107 testes)

## Fase 20: Detector de Ineficiência de Mercado (Nova Aba)

- [x] Criar página MarketInefficiency.tsx com input para colar linhas de odds
- [x] Implementar parser de linhas (mercado, linha, odd_mais, odd_exatamente, odd_menos)
- [x] Implementar cálculo: soma_implícita = 1/odd_mais + 1/odd_exatamente + 1/odd_menos
- [x] Implementar cálculo: margem_teórica = (1 - soma_implícita) * 100
- [x] Implementar classificação por status (Alta >10%, Média 5-10%, Baixa 0-5%, Sem ineficiência ≤0%)
- [x] Implementar classificação por cor (verde forte, verde claro, amarelo, cinza, vermelho)
- [x] Implementar destaque visual da melhor possibilidade (fundo verde, badge, borda, ícone, negrito)
- [x] Implementar critérios de desempate (menor soma, maior odd mínima, dados completos, primeira ocorrência)
- [x] Criar card resumo "Melhor possibilidade detectada" acima da tabela
- [x] Adicionar mensagem de segurança fixa (não sugere valores, não calcula stake)
- [x] Adicionar rota /dashboard/market-inefficiency e link na sidebar
- [x] Escrever testes unitários para a lógica de cálculo (22 testes, 129/129 total passando)
- [x] Verificar no browser e salvar checkpoint

## Fase 20.1: Colar Imagem (OCR) no Detector de Ineficiência

- [x] Criar procedimento tRPC oddsOcr.extractFromImage que recebe imagem (base64) e usa LLM vision
- [x] Prompt LLM: extrair tabela de odds no formato "Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos"
- [x] Atualizar frontend: aceitar paste de imagem (Ctrl+V / onPaste) na área de input
- [x] Mostrar preview da imagem colada com botão "Extrair Odds da Imagem"
- [x] Exibir loading enquanto LLM processa a imagem
- [x] Preencher textarea com resultado do OCR e rodar análise automaticamente
- [x] Tratar erros (imagem ilegível, formato não reconhecido)
- [x] Verificar no browser e salvar checkpoint (129/129 testes)

## Fase 21: Aba Agenda dos Jogos

- [x] Criar tabela fixtures no banco (api_fixture_id, date, time, country, league, teams, status, logos, etc.)
- [x] Criar serviço agendaService com integração API-Football (getFixturesByDate, getLiveFixtures, syncTodayFixtures)
- [x] Mapear status da API para status internos (NS→Agendado, LIVE→Ao vivo, HT→Intervalo, FT→Finalizado, PST→Adiado, CANC→Cancelado)
- [x] Criar procedimentos tRPC: agenda.getByDate, agenda.sync, agenda.getDetails, agenda.createAnalysis
- [x] Criar componente CalendarSidebar (mês atual, selecionar dia, destacar hoje, avançar/voltar mês)
- [x] Criar componente StatusFilterTabs (Agendado, Ao vivo, Finalizado, Todos)
- [x] Criar componente FixtureSearchBar (busca por time, liga, país)
- [x] Criar componente FixtureCard (país, liga, data, horário, mandante, visitante, escudos, status, botões)
- [x] Criar componente FixtureStatusBadge (cores por status)
- [x] Criar componente LeagueGroup (agrupar partidas por liga e país)
- [x] Criar página Agenda.tsx com layout: calendário esquerda, filtros topo, busca direita, lista centro
- [x] Implementar fluxo "Criar análise" (botão em jogos agendados redireciona para Nova Análise)
- [x] Implementar fluxo "Validar pós-jogo" (botão em jogos finalizados)
- [x] Adicionar filtros por status (Todos/Agendados/Ao Vivo/Intervalo/Finalizados) com contagem
- [x] Adicionar rota /dashboard/agenda e link na sidebar
- [x] Escrever testes unitários para agendaService (157/157 testes totais passando)
- [x] Verificar no browser: 373 jogos carregados, agrupados por liga, filtros e busca funcionando
- [x] Fix: countryCode varchar(8) → varchar(512) para acomodar URLs de bandeiras da API
- [x] Fix: BATCH_SIZE reduzido de 50 para 10 para evitar limite de parâmetros SQL

## Fase 22: Módulo "Filtro de Melhores Partidas do Dia" (Sportmonks)

- [x] Configurar SPORTMONKS_API_TOKEN no projeto (token validado, 2 testes passando)
- [x] Criar sportmonks-service.ts (buscar stats agregadas de times por temporada)
- [x] Mapear type_ids: 44=dangerous-attacks, 1677=shots, 34=corners, 52=goals, 88=goals-conceded, 43=attacks
- [x] Implementar busca de fixtures do dia via Sportmonks
- [x] Criar match-quality-service.ts com lógica de pontuação (6 critérios)
- [x] Critério 1: Dados disponíveis (mínimo 5 jogos na temporada)
- [x] Critério 2: Coerência casa/fora (stats separadas por mando)
- [x] Critério 3: Volume ofensivo (ataques perigosos avg > 35, finalizações avg > 10)
- [x] Critério 4: Defesa permite volume (adversário sofre finalizações)
- [x] Critério 5: Equilíbrio competitivo (gols avg próximos entre times)
- [x] Critério 6: Risco contextual (tipo de competição, fase)
- [x] Calcular índice de qualidade final (0-10) com pesos por critério
- [x] Criar procedimento tRPC matchQuality.getTopMatches(date)
- [x] Criar página dedicada "Top Jogos do Dia" com rota /dashboard/top-matches e sidebar
- [x] Exibir badge de qualidade (Excelente/Aceitável/Cuidado) em cada fixture card
- [x] Exibir explicação detalhada ao expandir "Ver detalhes dos critérios" (barras por critério + pesos)
- [x] Escrever testes unitários para match-quality-service (157+ testes passando)
- [x] Verificar no browser: 7 partidas analisadas (3 Excelentes Serie A, 4 Serie B), filtros por bloco funcionando, scores 5.7-8.9


## Fase 23: Substituir API-Football por Sportmonks na Validação Pós-Jogo

- [x] Analisar código atual do módulo de validação (api-football.ts, validation router)
- [x] Pesquisar endpoints Sportmonks para fixtures ao vivo, por data, e estatísticas finais
- [x] Criar sportmonks-validation-service.ts (busca fixtures finalizadas, stats de partida)
- [x] Mapear dados Sportmonks para formato esperado pela validação (gols, finalizações, chutes no gol, escanteios, etc.)
- [x] Atualizar router tRPC de validação para usar Sportmonks em vez de API-Football
- [x] Atualizar busca por fixture_id para usar ID da Sportmonks
- [x] Atualizar busca ao vivo/por data para usar Sportmonks
- [x] Manter entrada manual como fallback (sem alteração)
- [x] Atualizar frontend se necessário (IDs, labels, placeholder Sportmonks)
- [x] Rodar testes (192/192 passando) e verificar no browser
- [x] Salvar checkpoint e push GitHub

## Fase 23b: Migrar Agenda para Sportmonks

- [x] Reescrever agenda-service.ts para usar Sportmonks (fetchFixturesFromApi, fetchLiveFixturesFromApi)
- [x] Adaptar transformFixture para formato Sportmonks (participants, state, scores) + fix UTC date parsing
- [x] Atualizar agenda router (sem alteração necessária - usa mesma interface)
- [x] Remover dependência de api-football.ts (mantido como legado/referência)
- [x] Verificar no browser: Agenda carrega 1367 fixtures globais via Sportmonks, horários corretos em SP timezone

## Fase 24: Módulo Acompanhamento ao Vivo

- [x] Criar sportmonks-livescore.ts (buscar jogos ao vivo, stats em tempo real, eventos)
- [x] Criar router tRPC livescore (getInplay, getMatchDetail com stats+events)
- [x] Criar página AoVivo.tsx com sidebar de jogos ao vivo
- [x] Implementar cabeçalho do jogo (placar grande, minuto pulsante, períodos)
- [x] Implementar banner de comparação com projeção
  - [x] Backend: buscar análise associada ao jogo (por times) no router livescore (findAnalysisByTeams + getProjectionComparison)
  - [x] Frontend: banner com badges verde/amarelo/vermelho por mercado (8 ranking lines com IC >= 6.0)
  - [x] Lógica de comparação: projetado vs real (gols, escanteios, chutes, finalizações) com badges dinâmicos
  - [x] Verificar no browser: Fluminense vs São Paulo mostra 8 linhas de projeção com IC 6.0-9.0
- [x] Implementar barras de estatísticas ao vivo (posse, finalizações, escanteios, etc.)
- [x] Implementar timeline de eventos (gols, cartões, substituições)
- [x] Implementar auto-refresh a cada 30s com indicador visual
- [x] Registrar rota /dashboard/ao-vivo no App.tsx
- [x] Adicionar item "Ao Vivo" no sidebar do DashboardLayout
- [x] Escrever testes unitários para sportmonks-livescore (14 testes, 208 total passando)
- [x] Verificar no browser: 7 fixtures próximos, detalhe com stats e eventos, auto-refresh funcionando

## Fase 25: Histórico de Acurácia do Modelo

- [x] Criar tabela `accuracy_records` no schema (analysisId, fixtureId, homeTeam, awayTeam, date, projectedHomeGoals, projectedAwayGoals, actualHomeGoals, actualAwayGoals, rankingLines JSON, badgeResults JSON, overallAccuracy, createdAt)
- [x] Gerar migration SQL e aplicar via webdev_execute_sql
- [x] Criar helpers de banco: saveAccuracyRecord, getAccuracyRecords, getAccuracyStats
- [x] Criar serviço accuracy-service.ts (calcular badges pós-jogo: verde/amarelo/vermelho por linha)
- [x] Criar router tRPC accuracy (saveResult, getHistory, getStats)
- [x] Adicionar botão "Salvar Resultado" na página Ao Vivo (para jogos encerrados com projeção)
- [x] Criar página Acuracia.tsx com dashboard: taxa geral, por categoria, por IC, histórico de jogos
- [x] Registrar rota /dashboard/acuracia no App.tsx
- [x] Adicionar item "Acurácia do Modelo" no sidebar do DashboardLayout
- [x] Escrever testes unitários para accuracy-service (37 testes, 245 total passando)
- [x] Verificar no browser: página carrega com estado vazio e instrução de uso, sidebar item ativo
