import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Loader2,
  AlertTriangle,
  Target,
  Crosshair,
  CornerDownRight,
  Zap,
  Shield,
  TrendingUp,
  BarChart3,
  Info,
  ChevronDown,
  ChevronUp,
  Trophy,
  Filter,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchQualityItem {
  id: number;
  fixtureId: number;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  league: string;
  country: string;
  time: string | null;
  qualityScore: number;
  qualityLabel: string;
  dataAvailabilityScore: number;
  homeAwayScore: number;
  offensiveVolumeScore: number;
  defensiveVolumeScore: number;
  competitiveBalanceScore: number;
  contextRiskScore: number;
  bestBlocks: string[];
  alerts: string[];
  explanation: string | null;
  projectedStats: any;
}

type BlockFilter = 'all' | 'Chutes no gol' | 'Finalizações' | 'Escanteios' | 'Gols' | 'BTTS';

// ─── Quality Label Config ────────────────────────────────────────────────────

const QUALITY_CONFIG: Record<string, { label: string; color: string; bgClass: string; emoji: string }> = {
  excellent: { label: "Excelente", color: "text-green-700", bgClass: "bg-green-100 text-green-800 border-green-300", emoji: "⭐" },
  good: { label: "Boa", color: "text-blue-700", bgClass: "bg-blue-100 text-blue-800 border-blue-300", emoji: "✓" },
  acceptable: { label: "Aceitável", color: "text-yellow-700", bgClass: "bg-yellow-100 text-yellow-800 border-yellow-300", emoji: "~" },
  caution: { label: "Cuidado", color: "text-orange-700", bgClass: "bg-orange-100 text-orange-800 border-orange-300", emoji: "⚠" },
  avoid: { label: "Evitar", color: "text-red-700", bgClass: "bg-red-100 text-red-800 border-red-300", emoji: "✗" },
};

const BLOCK_ICONS: Record<string, typeof Target> = {
  'Chutes no gol': Target,
  'Finalizações': Crosshair,
  'Escanteios': CornerDownRight,
  'Gols': Zap,
  'BTTS': TrendingUp,
  'Evitar': Shield,
};

const BLOCK_FILTERS: { value: BlockFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Chutes no gol', label: 'Chutes no gol' },
  { value: 'Finalizações', label: 'Finalizações' },
  { value: 'Escanteios', label: 'Escanteios' },
  { value: 'Gols', label: 'Gols' },
  { value: 'BTTS', label: 'BTTS' },
];

// ─── Quality Score Ring ──────────────────────────────────────────────────────

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score >= 8 ? '#16a34a' : score >= 7 ? '#2563eb' : score >= 6 ? '#ca8a04' : score >= 5 ? '#ea580c' : '#dc2626';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Criteria Breakdown ──────────────────────────────────────────────────────

function CriteriaBreakdown({ item }: { item: MatchQualityItem }) {
  const criteria = [
    { label: "Dados disponíveis", score: item.dataAvailabilityScore, weight: "20%" },
    { label: "Coerência casa/fora", score: item.homeAwayScore, weight: "20%" },
    { label: "Volume ofensivo", score: item.offensiveVolumeScore, weight: "25%" },
    { label: "Defesa permite volume", score: item.defensiveVolumeScore, weight: "15%" },
    { label: "Equilíbrio competitivo", score: item.competitiveBalanceScore, weight: "10%" },
    { label: "Risco contextual", score: item.contextRiskScore, weight: "10%" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
      {criteria.map((c) => {
        const barColor = c.score >= 7 ? 'bg-green-500' : c.score >= 5 ? 'bg-yellow-500' : 'bg-red-500';
        return (
          <div key={c.label} className="text-xs">
            <div className="flex justify-between mb-0.5">
              <span className="text-muted-foreground truncate">{c.label}</span>
              <span className="font-medium ml-1">{c.score.toFixed(1)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${(c.score / 10) * 100}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">Peso: {c.weight}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Projected Stats Card ────────────────────────────────────────────────────

function ProjectedStatsCard({ stats }: { stats: any }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 p-3 bg-muted/30 rounded-lg">
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">Finalizações</p>
        <p className="text-sm font-bold">{stats.totalShots?.toFixed(1) || '—'}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">Chutes no gol</p>
        <p className="text-sm font-bold">{stats.totalShotsOnTarget?.toFixed(1) || '—'}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">Escanteios</p>
        <p className="text-sm font-bold">{stats.totalCorners?.toFixed(1) || '—'}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">Gols esperados</p>
        <p className="text-sm font-bold">{stats.totalGoalsExpected?.toFixed(1) || '—'}</p>
      </div>
    </div>
  );
}

// ─── Match Quality Card ──────────────────────────────────────────────────────

function MatchQualityCard({ item, onCreateAnalysis }: { item: MatchQualityItem; onCreateAnalysis: (item: MatchQualityItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = QUALITY_CONFIG[item.qualityLabel] || QUALITY_CONFIG.avoid;

  return (
    <Card className={`border-l-4 ${item.qualityLabel === 'excellent' ? 'border-l-green-500' : item.qualityLabel === 'good' ? 'border-l-blue-500' : item.qualityLabel === 'acceptable' ? 'border-l-yellow-500' : item.qualityLabel === 'caution' ? 'border-l-orange-500' : 'border-l-red-500'}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ScoreRing score={item.qualityScore} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">{item.homeTeam}</span>
              <span className="text-xs text-muted-foreground">vs</span>
              <span className="text-sm font-bold">{item.awayTeam}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{item.league}</span>
              {item.time && <span className="text-xs text-muted-foreground">• {item.time}</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`${config.bgClass} text-[10px]`}>
              {config.emoji} {config.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Criar análise"
              onClick={() => onCreateAnalysis(item)}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Best Blocks */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.bestBlocks.filter(b => b !== 'Evitar').map((block) => {
            const Icon = BLOCK_ICONS[block] || Target;
            return (
              <Badge key={block} variant="secondary" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
                <Icon className="h-2.5 w-2.5" />
                {block}
              </Badge>
            );
          })}
          {item.alerts.length > 0 && item.alerts.map((alert) => (
            <Badge key={alert} variant="secondary" className="text-[10px] gap-1 bg-orange-100 text-orange-700 border-orange-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              {alert}
            </Badge>
          ))}
        </div>

        {/* Explanation */}
        {item.explanation && (
          <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
            {item.explanation}
          </p>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Ocultar detalhes" : "Ver detalhes dos critérios"}
        </button>

        {expanded && (
          <>
            <CriteriaBreakdown item={item} />
            <ProjectedStatsCard stats={item.projectedStats} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Top Matches Page ───────────────────────────────────────────────────

export default function TopMatches() {
  const [, navigate] = useLocation();
  const [blockFilter, setBlockFilter] = useState<BlockFilter>('all');
  const [minScore, setMinScore] = useState(0);

  // Get today's date
  const dateStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const { data: topMatches, isLoading } = trpc.matchQuality.getTopMatches.useQuery({
    date: dateStr,
    minScore,
    blockFilter: blockFilter === 'all' ? undefined : blockFilter,
  });

  const calculateMutation = trpc.matchQuality.calculateForDate.useMutation();
  const utils = trpc.useUtils();

  const handleCalculate = async () => {
    await calculateMutation.mutateAsync({
      date: dateStr,
    });

    utils.matchQuality.getTopMatches.invalidate({ date: dateStr });
  };

  const handleCreateAnalysis = (item: MatchQualityItem) => {
    sessionStorage.setItem("agendaFixture", JSON.stringify({
      homeTeam: item.homeTeam,
      awayTeam: item.awayTeam,
      date: item.matchDate,
      league: item.league,
      country: item.country,
      fixtureId: item.fixtureId,
    }));
    navigate("/new");
  };

  // Filter results
  const filteredMatches = useMemo(() => {
    if (!topMatches) return [];
    return topMatches;
  }, [topMatches]);

  const excellentCount = filteredMatches.filter(m => m.qualityLabel === 'excellent').length;
  const goodCount = filteredMatches.filter(m => m.qualityLabel === 'good').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Top Jogos do Dia
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Partidas com melhor qualidade para projeção estatística
          </p>
        </div>
        <Button
          onClick={handleCalculate}
          disabled={calculateMutation.isPending}
          size="sm"
        >
          {calculateMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Star className="h-3.5 w-3.5 mr-1.5" />
          )}
          Calcular Qualidade
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p>
              O sistema analisa <strong>6 critérios</strong> usando dados da Sportmonks para classificar partidas de 0 a 10:
              dados disponíveis, coerência casa/fora, volume ofensivo, defesa permite volume, equilíbrio competitivo e risco contextual.
            </p>
            <p className="mt-1">
              Clique em <strong>"Calcular Qualidade"</strong> para analisar os jogos agendados de hoje (máx. 20 por vez).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredMatches.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Card className="flex-1 min-w-[120px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{excellentCount}</p>
              <p className="text-[10px] text-muted-foreground">Excelentes</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[120px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{goodCount}</p>
              <p className="text-[10px] text-muted-foreground">Boas</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[120px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{filteredMatches.length}</p>
              <p className="text-[10px] text-muted-foreground">Total analisadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Block Filters */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {BLOCK_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setBlockFilter(f.value)}
            className={`
              px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
              ${blockFilter === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent"
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </div>
      ) : calculateMutation.isPending ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">Calculando qualidade das partidas...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Buscando estatísticas dos times na Sportmonks. Isso pode levar alguns segundos.
            </p>
          </CardContent>
        </Card>
      ) : filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhuma partida analisada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Calcular Qualidade" para analisar os jogos agendados de hoje.
              Certifique-se de que a Agenda já foi carregada com jogos do dia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((item) => (
            <MatchQualityCard
              key={item.id}
              item={item}
              onCreateAnalysis={handleCreateAnalysis}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center italic mt-4">
        A classificação de qualidade é baseada em dados históricos e não garante resultados futuros.
        Use como ferramenta de apoio para selecionar partidas com maior previsibilidade estatística.
      </p>
    </div>
  );
}
