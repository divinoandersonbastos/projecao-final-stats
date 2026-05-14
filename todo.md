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
