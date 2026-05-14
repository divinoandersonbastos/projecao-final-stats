# Projeção Final Stats - TODO

## Fase 1: Banco de Dados e Backend

- [x] Configurar schema do banco de dados (análises, times, usuários)
- [x] Criar migrations SQL
- [x] Implementar helpers de query em server/db.ts
- [x] Criar procedures tRPC para análises (criar, listar, obter por ID)
- [x] Implementar motor de cálculo (finalizações, escanteios, gols, conversões)
- [x] Implementar cálculo de índice de confiança
- [x] Implementar cálculo de correlação entre linhas
- [ ] Criar testes unitários para motor de cálculo

## Fase 2: Frontend - Estrutura e Navegação

- [ ] Configurar DashboardLayout com sidebar
- [x] Criar navegação: Nova Análise, Histórico, Ranking
- [x] Configurar design system e tokens de cor/tipografia
- [x] Implementar tema visual elegante e sofisticado

## Fase 3: Frontend - Formulário de Entrada

- [x] Criar formulário de entrada de dados (mandante e visitante)
- [x] Implementar validação de campos
- [x] Adicionar campos: ataques perigosos, escanteios, finalizações, finalizações no gol, gols
- [x] Implementar lógica de envio para backend
- [x] Adicionar feedback visual (loading, sucesso, erro)

## Fase 4: Frontend - Exibição de Resultados

- [x] Criar seção de dados extraídos
- [x] Criar seção de projeções (finalizações, escanteios, gols)
- [x] Criar seção de conversões
- [x] Criar seção de resultado do modelo
- [x] Implementar projeção final FTHG x FTAG com placares alternativos

## Fase 5: Frontend - Ranking de Linhas

- [x] Implementar tabela de ranking com todas as colunas especificadas
- [x] Criar blocos de ranking por categoria (A, B, C, D)
- [x] Implementar indicadores de alerta (gols, placar exato, conversões > 40%)
- [x] Implementar indicação de correlação entre linhas
- [ ] Adicionar ordenação e filtros na tabela

## Fase 6: Frontend - Histórico

- [x] Criar página de histórico de análises
- [x] Implementar listagem de análises salvas
- [ ] Adicionar filtro por jogo/data
- [x] Implementar visualização de análise anterior
- [x] Adicionar opção de deletar análise

## Fase 7: Refinamentos e Testes

- [ ] Refinar visual e UX
- [ ] Testar responsividade
- [ ] Testar cálculos com dados reais
- [ ] Validar conformidade com especificações
- [ ] Otimizar performance
- [ ] Criar checkpoint final

## Fase 8: Deploy

- [ ] Preparar para publicação
- [ ] Validar em ambiente de produção
- [ ] Documentar uso da aplicação
