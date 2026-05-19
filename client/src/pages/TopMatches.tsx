import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowUpDown,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CriteriaDetail {
  criterion: string;
  score: number;
  weight: number;
  contribution: number;
  reading: string;
}

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
  bestBlock: string;
  bestBlocks: string[];
  alerts: string[];
  explanation: string | null;
  projectedStats: any;
  criteriaDetails: CriteriaDetail[];
}

type BlockFilter = 'all' | 'Chutes no gol' | 'Finalizações' | 'Escanteios' | 'Gols' | 'BTTS';
type SortBy = 'score' | 'time' | 'league' | 'country' | 'bestBlock';

// ─── Quality Label Config ────────────────────────────────────────────────────

const QUALITY_CONFIG: Record<string, { label: string; color: string; bgClass: string; borderClass: string }> = {
  excellent: { label: "Excelente", color: "text-green-700", bgClass: "bg-green-100 text-green-800 border-green-300", borderClass: "border-l-green-500" },
  good: { label: "Boa", color: "text-blue-700", bgClass: "bg-blue-100 text-blue-800 border-blue-300", borderClass: "border-l-blue-500" },
  acceptable: { label: "Aceitável", color: "text-yellow-700", bgClass: "bg-yellow-100 text-yellow-800 border-yellow-300", borderClass: "border-l-yellow-500" },
  caution: { label: "Cuidado", color: "text-orange-700", bgClass: "bg-orange-100 text-orange-800 border-orange-300", borderClass: "border-l-orange-500" },
  avoid: { label: "Evitar", color: "text-red-700", bgClass: "bg-red-100 text-red-800 border-red-300", borderClass: "border-l-red-500" },
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

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'score', label: 'Nota' },
  { value: 'time', label: 'Horário' },
  { value: 'league', label: 'Liga' },
  { value: 'country', label: 'País' },
  { value: 'bestBlock', label: 'Melhor bloco' },
];

// ─── Quality Score Ring ──────────────────────────────────────────────────────

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score >= 8.5 ? '#16a34a' : score >= 7.5 ? '#2563eb' : score >= 6.5 ? '#ca8a04' : score >= 5.0 ? '#ea580c' : '#dc2626';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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

// ─── Criteria Table ─────────────────────────────────────────────────────────

function CriteriaTable({ criteriaDetails }: { criteriaDetails: CriteriaDetail[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Critério</th>
            <th className="text-center py-1.5 px-2 font-semibold text-muted-foreground">Nota</th>
            <th className="text-center py-1.5 px-2 font-semibold text-muted-foreground">Peso</th>
            <th className="text-center py-1.5 px-2 font-semibold text-muted-foreground">Contribuição</th>
            <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Leitura</th>
          </tr>
        </thead>
        <tbody>
          {criteriaDetails.map((c, i) => {
            const scoreColor = c.score >= 8 ? 'text-green-600' : c.score >= 6 ? 'text-yellow-600' : c.score >= 4 ? 'text-orange-600' : 'text-red-600';
            return (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 px-2 font-medium">{c.criterion}</td>
                <td className={`py-1.5 px-2 text-center font-bold ${scoreColor}`}>{c.score.toFixed(1)}</td>
                <td className="py-1.5 px-2 text-center text-muted-foreground">{(c.weight * 100).toFixed(0)}%</td>
                <td className="py-1.5 px-2 text-center font-medium">{c.contribution.toFixed(2)}</td>
                <td className="py-1.5 px-2 text-muted-foreground italic">{c.reading}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td className="py-1.5 px-2 font-bold">Total</td>
            <td className="py-1.5 px-2 text-center font-bold">
              {criteriaDetails.reduce((sum, c) => sum + c.score, 0).toFixed(1)}
            </td>
            <td className="py-1.5 px-2 text-center font-bold">100%</td>
            <td className="py-1.5 px-2 text-center font-bold">
              {criteriaDetails.reduce((sum, c) => sum + c.contribution, 0).toFixed(2)}
            </td>
            <td className="py-1.5 px-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Match Quality Card ──────────────────────────────────────────────────────

function MatchQualityCard({ item, onCreateAnalysis }: { item: MatchQualityItem; onCreateAnalysis: (item: MatchQualityItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = QUALITY_CONFIG[item.qualityLabel] || QUALITY_CONFIG.avoid;

  return (
    <Card className={`border-l-4 ${config.borderClass} transition-all hover:shadow-md`}>
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
              {item.time && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" /> {item.time}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="outline" className={`${config.bgClass} text-[10px] font-semibold`}>
              {config.label}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1"
              onClick={() => onCreateAnalysis(item)}
            >
              <BarChart3 className="h-3 w-3" />
              Criar análise
            </Button>
          </div>
        </div>

        {/* Best Blocks & Alerts */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.bestBlock && item.bestBlock !== 'Evitar' && (
            <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/15 text-primary border-primary/30 font-semibold">
              <Star className="h-2.5 w-2.5" />
              Melhor: {item.bestBlock}
            </Badge>
          )}
          {item.bestBlocks.filter(b => b !== 'Evitar' && b !== item.bestBlock).map((block) => {
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
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {item.explanation}
          </p>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline font-medium"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Ocultar detalhes" : "Ver detalhes dos critérios"}
        </button>

        {expanded && (
          <CriteriaTable criteriaDetails={item.criteriaDetails} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Top 5 Section ───────────────────────────────────────────────────────────

function Top5Section({ matches, onCreateAnalysis }: { matches: MatchQualityItem[]; onCreateAnalysis: (item: MatchQualityItem) => void }) {
  const top5 = matches.slice(0, 5);
  if (top5.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
      <CardContent className="p-4">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-yellow-600" />
          Top 5 Jogos do Dia
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-yellow-200 dark:border-yellow-800">
                <th className="text-left py-1.5 px-1 font-semibold text-muted-foreground w-8">#</th>
                <th className="text-left py-1.5 px-1 font-semibold text-muted-foreground">Jogo</th>
                <th className="text-left py-1.5 px-1 font-semibold text-muted-foreground hidden sm:table-cell">Liga</th>
                <th className="text-center py-1.5 px-1 font-semibold text-muted-foreground">Horário</th>
                <th className="text-center py-1.5 px-1 font-semibold text-muted-foreground">Nota</th>
                <th className="text-left py-1.5 px-1 font-semibold text-muted-foreground hidden md:table-cell">Melhor bloco</th>
                <th className="text-left py-1.5 px-1 font-semibold text-muted-foreground hidden lg:table-cell">Alerta</th>
                <th className="py-1.5 px-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {top5.map((item, idx) => {
                const config = QUALITY_CONFIG[item.qualityLabel] || QUALITY_CONFIG.avoid;
                return (
                  <tr key={item.id} className="border-b border-yellow-100 dark:border-yellow-900/50 last:border-0">
                    <td className="py-2 px-1 font-bold text-yellow-700">{idx + 1}</td>
                    <td className="py-2 px-1">
                      <span className="font-medium">{item.homeTeam}</span>
                      <span className="text-muted-foreground mx-1">vs</span>
                      <span className="font-medium">{item.awayTeam}</span>
                    </td>
                    <td className="py-2 px-1 text-muted-foreground hidden sm:table-cell">{item.league}</td>
                    <td className="py-2 px-1 text-center">{item.time || '—'}</td>
                    <td className="py-2 px-1 text-center">
                      <Badge variant="outline" className={`${config.bgClass} text-[9px]`}>
                        {item.qualityScore.toFixed(1)}
                      </Badge>
                    </td>
                    <td className="py-2 px-1 hidden md:table-cell">
                      {item.bestBlock !== 'Evitar' && (
                        <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">
                          {item.bestBlock}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-1 hidden lg:table-cell text-muted-foreground">
                      {item.alerts[0] || '—'}
                    </td>
                    <td className="py-2 px-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Criar análise"
                        onClick={() => onCreateAnalysis(item)}
                      >
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Top Matches Page ───────────────────────────────────────────────────

export default function TopMatches() {
  const [, navigate] = useLocation();
  const [blockFilter, setBlockFilter] = useState<BlockFilter>('all');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [hideInsufficientData, setHideInsufficientData] = useState(false);
  const [hideHighRisk, setHideHighRisk] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
    hideInsufficientData,
    hideHighRisk,
  });

  const calculateMutation = trpc.matchQuality.calculateForDate.useMutation();
  const utils = trpc.useUtils();

  const handleCalculate = async () => {
    await calculateMutation.mutateAsync({ date: dateStr });
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
      time: item.time,
      mode: 'mode2',
    }));
    navigate("/new");
  };

  // Sort results
  const sortedMatches = useMemo(() => {
    if (!topMatches) return [];
    const sorted = [...topMatches];
    switch (sortBy) {
      case 'score':
        sorted.sort((a, b) => b.qualityScore - a.qualityScore);
        break;
      case 'time':
        sorted.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
        break;
      case 'league':
        sorted.sort((a, b) => a.league.localeCompare(b.league));
        break;
      case 'country':
        sorted.sort((a, b) => a.country.localeCompare(b.country));
        break;
      case 'bestBlock':
        sorted.sort((a, b) => (a.bestBlock || '').localeCompare(b.bestBlock || ''));
        break;
    }
    return sorted;
  }, [topMatches, sortBy]);

  const excellentCount = sortedMatches.filter(m => m.qualityLabel === 'excellent').length;
  const goodCount = sortedMatches.filter(m => m.qualityLabel === 'good').length;
  const acceptableCount = sortedMatches.filter(m => m.qualityLabel === 'acceptable').length;

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

      {/* Summary Cards */}
      {sortedMatches.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Card className="flex-1 min-w-[100px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{excellentCount}</p>
              <p className="text-[10px] text-muted-foreground">Excelentes</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[100px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{goodCount}</p>
              <p className="text-[10px] text-muted-foreground">Boas</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[100px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{acceptableCount}</p>
              <p className="text-[10px] text-muted-foreground">Aceitáveis</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[100px]">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{sortedMatches.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top 5 Section */}
      {sortedMatches.length > 0 && (
        <Top5Section
          matches={sortedMatches.sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 5)}
          onCreateAnalysis={handleCreateAnalysis}
        />
      )}

      {/* Filters Row */}
      <div className="space-y-2">
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

          {/* Score filters */}
          <span className="text-muted-foreground text-[10px] ml-2">|</span>
          {[{ value: 0, label: 'Todos' }, { value: 8, label: 'Nota 8+' }, { value: 7, label: 'Nota 7+' }].map((f) => (
            <button
              key={f.value}
              onClick={() => setMinScore(f.value)}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                ${minScore === f.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent"
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showFilters ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showFilters ? 'Ocultar filtros avançados' : 'Filtros avançados'}
          </button>

          {/* Sort */}
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="text-[11px] bg-muted border-none rounded px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>Ordenar por {o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={hideInsufficientData}
                onChange={(e) => setHideInsufficientData(e.target.checked)}
                className="rounded border-border h-3.5 w-3.5"
              />
              Ocultar dados insuficientes
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={hideHighRisk}
                onChange={(e) => setHideHighRisk(e.target.checked)}
                className="rounded border-border h-3.5 w-3.5"
              />
              Ocultar alto risco contextual
            </label>
          </div>
        )}
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
      ) : sortedMatches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhuma partida analisada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Calcular Qualidade" para analisar os jogos agendados de hoje.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedMatches.map((item) => (
            <MatchQualityCard
              key={item.id}
              item={item}
              onCreateAnalysis={handleCreateAnalysis}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-3">
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            <strong>A Qualidade da Projeção mede apenas a aderência estatística esperada do jogo.
            Ela não representa garantia de resultado.</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
