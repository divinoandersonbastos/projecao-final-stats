import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, Target, Award, BarChart2,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Calendar, Trophy, Minus
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeResult {
  line: string;
  projection: number;
  baseline: number;
  confidenceIndex: number;
  category: string;
  actualValue: number | null;
  badge: 'green' | 'yellow' | 'red' | 'pending';
  hit: boolean;
  description: string;
}

interface AccuracyRecord {
  id: number;
  matchDate: string;
  homeTeamName: string;
  awayTeamName: string;
  league: string | null;
  projectedHomeGoals: number;
  projectedAwayGoals: number;
  actualHomeGoals: number;
  actualAwayGoals: number;
  rankingLineResults: BadgeResult[];
  totalLines: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  hitRate: number;
  goalProjectionHit: number | null;
  goalDiff: number | null;
  createdAt: Date;
}

// ─── Badge Components ─────────────────────────────────────────────────────────

function BadgeIcon({ badge }: { badge: BadgeResult['badge'] }) {
  if (badge === 'green') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (badge === 'yellow') return <AlertCircle className="w-4 h-4 text-amber-500" />;
  if (badge === 'red') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function HitRateBadge({ rate }: { rate: number }) {
  const color = rate >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : rate >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {rate.toFixed(0)}%
    </span>
  );
}

// ─── Match Card ───────────────────────────────────────────────────────────────

function MatchCard({ record }: { record: AccuracyRecord }) {
  const [expanded, setExpanded] = useState(false);

  const goalHit = record.goalProjectionHit === 1;
  const projScore = `${record.projectedHomeGoals}x${record.projectedAwayGoals}`;
  const realScore = `${record.actualHomeGoals}x${record.actualAwayGoals}`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {record.league && (
                <span className="text-xs text-muted-foreground bg-background border rounded px-2 py-0.5 shrink-0">
                  {record.league}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {record.matchDate}
              </span>
            </div>
            <p className="font-semibold text-sm mt-1 truncate">
              {record.homeTeamName} vs {record.awayTeamName}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Projetado:</span>
                <span className={`text-sm font-bold ${goalHit ? 'text-emerald-600' : 'text-foreground'}`}>
                  {projScore}
                </span>
                {goalHit && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Real:</span>
                <span className="text-sm font-bold">{realScore}</span>
              </div>
            </div>
            <HitRateBadge rate={record.hitRate} />
          </div>
        </div>

        {/* Summary badges row */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {record.greenCount} confirmados
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            {record.yellowCount} parciais
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            {record.redCount} não confirmados
          </span>
          <span className="ml-auto">
            {record.totalLines} linhas avaliadas
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar' : 'Detalhes'}
          </Button>
        </div>

        {/* Expanded ranking lines */}
        {expanded && (
          <div className="border-t divide-y">
            {record.rankingLineResults.map((result, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                <BadgeIcon badge={result.badge} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.line}</p>
                  <p className="text-xs text-muted-foreground">{result.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground">IC {result.confidenceIndex.toFixed(1)}</span>
                  <p className="text-xs text-muted-foreground">{result.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Stats Overview ───────────────────────────────────────────────────────────

function StatsOverview({ stats }: {
  stats: {
    totalMatches: number;
    totalLines: number;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    avgHitRate: number;
    goalHits: number;
    avgGoalDiff: number;
  }
}) {
  const hitRate = stats.avgHitRate;
  const goalAccuracy = stats.totalMatches > 0
    ? Math.round((stats.goalHits / stats.totalMatches) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Partidas</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalMatches}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.totalLines} linhas avaliadas</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Taxa de Acerto</span>
          </div>
          <p className={`text-3xl font-bold ${hitRate >= 70 ? 'text-emerald-600' : hitRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {hitRate.toFixed(1)}%
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-emerald-600">{stats.greenCount} ✓</span>
            <span className="text-xs text-muted-foreground mx-1">·</span>
            <span className="text-xs text-amber-600">{stats.yellowCount} ~</span>
            <span className="text-xs text-muted-foreground mx-1">·</span>
            <span className="text-xs text-red-600">{stats.redCount} ✗</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Placar Exato</span>
          </div>
          <p className={`text-3xl font-bold ${goalAccuracy >= 30 ? 'text-emerald-600' : 'text-foreground'}`}>
            {goalAccuracy}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">{stats.goalHits} de {stats.totalMatches} acertos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Erro Médio Gols</span>
          </div>
          <p className={`text-3xl font-bold ${stats.avgGoalDiff <= 1 ? 'text-emerald-600' : stats.avgGoalDiff <= 2 ? 'text-amber-600' : 'text-red-600'}`}>
            ±{stats.avgGoalDiff.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">gols de diferença</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Category Chart ───────────────────────────────────────────────────────────

function CategoryAccuracy({ data }: {
  data: { category: string; total: number; hits: number; hitRate: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum dado por categoria ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((cat) => (
        <div key={cat.category}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{cat.category}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{cat.hits}/{cat.total}</span>
              <HitRateBadge rate={cat.hitRate} />
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                cat.hitRate >= 70 ? 'bg-emerald-500' : cat.hitRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${cat.hitRate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Acuracia() {
  const { data: statsData, isLoading: statsLoading } = trpc.accuracy.getStats.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.accuracy.getHistory.useQuery({ limit: 50 });

  const isLoading = statsLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Histórico de Acurácia</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = statsData?.stats;
  const byCategory = statsData?.byCategory ?? [];
  const records = (history ?? []) as AccuracyRecord[];

  if (!stats || stats.totalMatches === 0) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Histórico de Acurácia</h1>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Nenhum resultado salvo ainda</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Após um jogo encerrado, acesse o módulo <strong>Ao Vivo</strong>, selecione a partida
              e clique em <strong>"Salvar Resultado"</strong> para registrar a comparação entre
              projeção e resultado real.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Histórico de Acurácia</h1>
            <p className="text-sm text-muted-foreground">
              Desempenho do modelo de projeção em partidas encerradas
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Tabs: History + Category */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">
            Histórico de Partidas ({records.length})
          </TabsTrigger>
          <TabsTrigger value="category">
            Por Categoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3 mt-4">
          {records.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Nenhuma partida no histórico.
              </CardContent>
            </Card>
          ) : (
            records.map(record => (
              <MatchCard key={record.id} record={record} />
            ))
          )}
        </TabsContent>

        <TabsContent value="category" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acurácia por Categoria de Mercado</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryAccuracy data={byCategory} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
