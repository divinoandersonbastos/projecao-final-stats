# Projeção Final Stats

Análise estatística sofisticada de partidas de futebol com cálculo automático de projeções e ranking inteligente de linhas.

## 🎯 Visão Geral

**Projeção Final Stats** é uma ferramenta de análise de alto nível que transforma dados estatísticos de partidas de futebol em decisões baseadas em inteligência. Através de um motor de cálculo avançado, a aplicação projeta finalizações, escanteios e gols, gerando um ranking automático das melhores linhas com índice de confiança.

## ✨ Funcionalidades Principais

### 1. **Entrada de Dados Estruturada**
- Formulário elegante para mandante e visitante
- Campos: ataques perigosos, escanteios, finalizações, finalizações no gol, gols
- Validação em tempo real com feedback visual

### 2. **Motor de Cálculo Automático**
- **Finalizações Esperadas**: Baseadas em ataques perigosos e padrões históricos
- **Escanteios Ajustados**: Fator de ataque perigoso aplicado
- **Gols Esperados**: Via conversão ofensiva e defensiva
- **Índice de Confiança**: 0-100, considerando margem, estabilidade e correlação

### 3. **Exibição Estruturada de Resultados**

#### Dados Extraídos
Exibe os dados originais inseridos para ambos os times

#### Projeções
- Finalizações projetadas
- Escanteios projetados
- Gols projetados

#### Conversões
- Conversão ofensiva (%)
- Conversão defensiva (%)

#### Resultado do Modelo
- Projeção principal FTHG x FTAG
- Placares alternativos próximos

### 4. **Ranking das Melhores Linhas**

Tabela consolidada com colunas:
- **Rank**: Posição no ranking
- **Linha**: Descrição da linha (ex: "Over 2.5")
- **Projeção**: Valor calculado
- **Linha-base**: Valor de referência
- **Margem absoluta**: Diferença em pontos
- **Margem %**: Diferença percentual
- **Estabilidade**: Alta / Média / Baixa
- **Correlação**: Baixa / Média / Alta
- **Índice de confiança**: 0-100
- **Status**: Forte / Boa / Média / Fraca / Sem sustentação

#### Blocos por Categoria
- **Escanteios (A)**: Linhas de escanteios
- **Finalizações (B)**: Linhas de finalizações
- **Finalizações no Gol (C)**: Linhas de finalizações no gol
- **Gols (D)**: Linhas de gols

### 5. **Indicadores de Alerta Automáticos**
- ⚠️ **Margem Alta**: Linhas com margem > 40% indicam volatilidade
- 🔴 **Baixa Estabilidade**: Variações significativas em diferentes cenários
- Alertas gerados automaticamente sem intervenção manual

### 6. **Histórico Persistido**
- Todas as análises salvas em banco de dados
- Consulta por jogo/data
- Visualização de análises anteriores
- Deleção com invalidação de cache

### 7. **Dashboard Intuitivo**
- Sidebar com navegação: Nova Análise, Histórico, Ranking
- Design elegante e sofisticado
- Tema light/dark
- Responsivo para desktop e mobile

## 🚀 Como Usar

### 1. **Iniciar Nova Análise**
1. Clique em "Nova Análise" no sidebar
2. Preencha os dados do time mandante
3. Preencha os dados do time visitante
4. Clique em "Calcular Projeções"

### 2. **Visualizar Resultados**
- Seção "Dados Extraídos": Confirme os valores inseridos
- Seção "Projeções": Veja as projeções calculadas
- Seção "Conversões": Analise as taxas de conversão
- Seção "Resultado do Modelo": Projeção final e placares alternativos
- Seção "Ranking": Melhores linhas com índice de confiança

### 3. **Consultar Histórico**
1. Clique em "Histórico" no sidebar
2. Veja todas as análises anteriores
3. Clique em uma análise para visualizar detalhes completos
4. Use o botão de deleção para remover análises

### 4. **Explorar Ranking Consolidado**
1. Clique em "Ranking" no sidebar
2. Filtre por categoria (Escanteios, Finalizações, etc)
3. Ordene por Índice de Confiança, Margem ou Estabilidade
4. Identifique linhas com alertas (⚠️ 🔴)

## 📊 Interpretação dos Resultados

### Índice de Confiança (0-100)
- **80-100**: Forte - Altamente confiável
- **60-79**: Boa - Confiável
- **40-59**: Média - Moderadamente confiável
- **20-39**: Fraca - Baixa confiança
- **0-19**: Sem sustentação - Não recomendado

### Estabilidade
- **Alta**: Linha mantém consistência em diferentes cenários
- **Média**: Variações moderadas
- **Baixa**: Volatilidade significativa

### Correlação
- **Baixa**: Linhas independentes
- **Média**: Alguma interdependência
- **Alta**: Forte interdependência

## 🔧 Tecnologia

### Backend
- **Node.js + Express**: Servidor web
- **tRPC**: API type-safe
- **Drizzle ORM**: Gerenciamento de banco de dados
- **MySQL/TiDB**: Persistência de dados

### Frontend
- **React 19**: Interface de usuário
- **Tailwind CSS 4**: Estilização
- **shadcn/ui**: Componentes reutilizáveis
- **Wouter**: Roteamento
- **Vitest**: Testes unitários

## 📈 Fórmulas de Cálculo

### Finalizações Esperadas
```
Finalizações = (Ataques Perigosos × Fator de Conversão) + Ajuste Histórico
```

### Escanteios Ajustados
```
Escanteios = Escanteios Base × (1 + Fator de Ataque Perigoso)
```

### Gols Esperados
```
Gols = Finalizações no Gol × Taxa de Conversão Ofensiva
```

### Índice de Confiança
```
IC = (Margem % × 0.4) + (Estabilidade × 0.3) + (Correlação × 0.3)
```

## ✅ Testes

A aplicação inclui 6 testes unitários cobrindo:
- Cálculos com entrada válida
- Tratamento de valores zero
- Estrutura de dados de ranking
- Validação de ranges
- Cenários real-world com alta volatilidade

Execute testes com:
```bash
pnpm test
```

## 🎨 Design

A interface segue princípios de design elegante e sofisticado:
- **Tipografia**: Hierarquia clara e legibilidade
- **Cores**: OKLCH palette com contraste adequado
- **Espaçamento**: Sistema consistente de spacing
- **Componentes**: Reutilizáveis e acessíveis
- **Animações**: Transições suaves e responsivas

## 📱 Responsividade

A aplicação é totalmente responsiva:
- Desktop: Layout completo com sidebar
- Tablet: Sidebar colapsível
- Mobile: Navegação otimizada

## 🔐 Segurança

- Autenticação via Manus OAuth
- Proteção de rotas com `protectedProcedure`
- Validação de entrada em formulários
- Cache invalidation após operações

## 📝 Licença

MIT

## 👨‍💻 Suporte

Para dúvidas ou sugestões, entre em contato através do formulário de feedback da aplicação.

---

**Projeção Final Stats** - Transformando dados em decisões baseadas em inteligência.
