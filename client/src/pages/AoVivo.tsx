import { useState, useEffect, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Radio,
  RefreshCw,
  Clock,
  CircleDot,
  ArrowRightLeft,
  AlertTriangle,
  Square,
  Target,
  Shield,
  Zap,
  CornerDownRight,
  Eye,
  ChevronRight,
  Activity,
  Timer,
  Wifi,
  WifiOff,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BarChart3,
  Save,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────

interface LiveFixture {
  id: number;
  leagueId: number;
  leagueName: string;
  leagueLogo: string;
  seasonId: number;
  startingAt: string;
  homeTeam: { id: number; name: string; logo: string };
  awayTeam: { id: number; name: string; logo: string };
  homeGoals: number | null;
  awayGoals: number | null;
  state: string;
  stateLong: string;
  minute: number | null;
  periodScores: { period: string; homeGoals: number; awayGoals: number }[];
}

interface LiveStats {
  possession: { home: number | null; away: number | null };
  totalShots: { home: number | null; away: number | null };
  shotsOnTarget: { home: number | null; away: number | null };
  corners: { home: number | null; away: number | null };
  dangerousAttacks: { home: number | null; away: number | null };
  attacks: { home: number | null; away: number | null };
  fouls: { home: number | null; away: number | null };
  offsides: { home: number | null; away: number | null };
  yellowCards: { home: number | null; away: number | null };
  redCards: { home: number | null; away: number | null };
  passes: { home: number | null; away: number | null };
  passAccuracy: { home: number | null; away: number | null };
  tackles: { home: number | null; away: number | null };
  gkSaves: { home: number | null; away: number | null };
}

interface MatchEvent {
  id: number;
  minute: number;
  extraMinute: number | null;
  type: 'goal' | 'own_goal' | 'penalty' | 'missed_penalty' | 'yellow_card' | 'second_yellow' | 'red_card' | 'substitution' | 'var' | 'other';
  teamId: number;
  teamName: string;
  playerName: string;
  relatedPlayerName: string | null;
  description: string;
}

interface MatchDetail {
  fixture: LiveFixture;
  stats: LiveStats;
  events: MatchEvent[];
}

// ─── Helper Components ─────────────────────────────────────────

function PulsingDot({ className = '' }: { className?: string }) {
  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  );
}

function StateName({ state, minute }: { state: string; minute: number | null }) {
  const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(state);
  const isFinished = ['FT', 'AET', 'PEN'].includes(state);

  if (isLive) {
    return (
      <div className="flex items-center gap-1.5">
        <PulsingDot />
        <span className="text-red-600 font-bold text-sm">
          {state === 'HT' ? 'Intervalo' : minute ? `${minute}'` : state}
        </span>
      </div>
    );
  }

  if (isFinished) {
    return <span className="text-muted-foreground font-medium text-sm">Encerrado</span>;
  }

  return <span className="text-muted-foreground text-sm">{state}</span>;
}

function TeamLogo({ src, name, size = 'md' }: { src: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <img
      src={src}
      alt={name}
      className={`${sizeClasses[size]} object-contain`}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function formatTime(utcDateStr: string): string {
  const d = new Date(utcDateStr.includes('T') ? utcDateStr : utcDateStr + 'Z');
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function formatPeriod(period: string): string {
  switch (period) {
    case '1ST_HALF': return '1T';
    case '2ND_HALF': return '2T';
    case 'EXTRA_TIME': return 'PRO';
    default: return period;
  }
}

// ─── Sidebar Fixture Card ──────────────────────────────────────

function FixtureListItem({
  fixture,
  isSelected,
  onClick,
}: {
  fixture: LiveFixture;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(fixture.state);
  const isFinished = ['FT', 'AET', 'PEN'].includes(fixture.state);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all duration-150 ${
        isSelected
          ? 'bg-primary/10 border border-primary/30 shadow-sm'
          : 'hover:bg-accent/50 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate max-w-[70%]">
          {fixture.leagueName}
        </span>
        <StateName state={fixture.state} minute={fixture.minute} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {fixture.homeTeam.logo && <TeamLogo src={fixture.homeTeam.logo} name={fixture.homeTeam.name} size="sm" />}
            <span className="text-sm font-medium truncate">{fixture.homeTeam.name}</span>
          </div>
          <span className={`text-sm font-bold tabular-nums ${isLive ? 'text-red-600' : ''}`}>
            {fixture.homeGoals ?? '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {fixture.awayTeam.logo && <TeamLogo src={fixture.awayTeam.logo} name={fixture.awayTeam.name} size="sm" />}
            <span className="text-sm font-medium truncate">{fixture.awayTeam.name}</span>
          </div>
          <span className={`text-sm font-bold tabular-nums ${isLive ? 'text-red-600' : ''}`}>
            {fixture.awayGoals ?? '-'}
          </span>
        </div>
      </div>

      {!isLive && !isFinished && (
        <div className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(fixture.startingAt)}
        </div>
      )}
    </button>
  );
}

// ─── Stat Bar ──────────────────────────────────────────────────

function StatBar({
  label,
  home,
  away,
  icon,
  isPercentage = false,
}: {
  label: string;
  home: number | null;
  away: number | null;
  icon: React.ReactNode;
  isPercentage?: boolean;
}) {
  if (home === null && away === null) return null;

  const h = home ?? 0;
  const a = away ?? 0;
  const total = h + a || 1;
  const homePct = isPercentage ? h : (h / total) * 100;
  const awayPct = isPercentage ? a : (a / total) * 100;

  const homeWins = h > a;
  const awayWins = a > h;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-semibold tabular-nums ${homeWins ? 'text-primary' : ''}`}>
          {isPercentage ? `${h}%` : h}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${awayWins ? 'text-primary' : ''}`}>
          {isPercentage ? `${a}%` : a}
        </span>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/30">
        <div
          className={`rounded-l-full transition-all duration-500 ${homeWins ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          style={{ width: `${isPercentage ? homePct : (h / total) * 100}%` }}
        />
        <div
          className={`rounded-r-full transition-all duration-500 ${awayWins ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          style={{ width: `${isPercentage ? awayPct : (a / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Event Icon ────────────────────────────────────────────────

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  switch (type) {
    case 'goal':
      return <CircleDot className="h-4 w-4 text-green-600" />;
    case 'own_goal':
      return <CircleDot className="h-4 w-4 text-red-600" />;
    case 'penalty':
      return <Target className="h-4 w-4 text-green-600" />;
    case 'missed_penalty':
      return <Target className="h-4 w-4 text-red-400" />;
    case 'yellow_card':
      return <Square className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />;
    case 'second_yellow':
      return (
        <div className="relative">
          <Square className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <Square className="h-3 w-3 fill-red-500 text-red-500 absolute -top-1 -right-1" />
        </div>
      );
    case 'red_card':
      return <Square className="h-3.5 w-3.5 fill-red-500 text-red-500" />;
    case 'substitution':
      return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    case 'var':
      return <Eye className="h-4 w-4 text-purple-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function eventLabel(type: MatchEvent['type']): string {
  switch (type) {
    case 'goal': return 'Gol';
    case 'own_goal': return 'Gol Contra';
    case 'penalty': return 'Pênalti';
    case 'missed_penalty': return 'Pênalti Perdido';
    case 'yellow_card': return 'Cartão Amarelo';
    case 'second_yellow': return '2o Amarelo';
    case 'red_card': return 'Cartão Vermelho';
    case 'substitution': return 'Substituição';
    case 'var': return 'VAR';
    default: return 'Evento';
  }
}

// ─── Match Header ──────────────────────────────────────────────

function MatchHeader({ fixture }: { fixture: LiveFixture }) {
  const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(fixture.state);

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
      <CardContent className="p-6">
        {/* League info */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {fixture.leagueLogo && (
            <img src={fixture.leagueLogo} alt={fixture.leagueName} className="h-5 w-5 object-contain" />
          )}
          <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">
            {fixture.leagueName}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center justify-center gap-6 md:gap-10">
          {/* Home */}
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            {fixture.homeTeam.logo && (
              <TeamLogo src={fixture.homeTeam.logo} name={fixture.homeTeam.name} size="lg" />
            )}
            <span className="text-sm font-semibold text-center truncate max-w-full">
              {fixture.homeTeam.name}
            </span>
          </div>

          {/* Score center */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <span className={`text-4xl md:text-5xl font-black tabular-nums ${isLive ? 'text-white' : 'text-slate-200'}`}>
                {fixture.homeGoals ?? 0}
              </span>
              <span className="text-2xl text-slate-500 font-light">:</span>
              <span className={`text-4xl md:text-5xl font-black tabular-nums ${isLive ? 'text-white' : 'text-slate-200'}`}>
                {fixture.awayGoals ?? 0}
              </span>
            </div>

            {/* State */}
            <div className="flex items-center gap-1.5 mt-1">
              {isLive && <PulsingDot />}
              <span className={`text-sm font-bold ${isLive ? 'text-red-400' : 'text-slate-400'}`}>
                {fixture.state === 'HT'
                  ? 'Intervalo'
                  : isLive && fixture.minute
                    ? `${fixture.minute}'`
                    : fixture.stateLong}
              </span>
            </div>

            {/* Period scores */}
            {fixture.periodScores.length > 0 && (
              <div className="flex items-center gap-3 mt-2">
                {fixture.periodScores.map((ps, i) => (
                  <span key={i} className="text-xs text-slate-400">
                    {formatPeriod(ps.period)}: {ps.homeGoals}-{ps.awayGoals}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            {fixture.awayTeam.logo && (
              <TeamLogo src={fixture.awayTeam.logo} name={fixture.awayTeam.name} size="lg" />
            )}
            <span className="text-sm font-semibold text-center truncate max-w-full">
              {fixture.awayTeam.name}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stats Section ─────────────────────────────────────────────

function StatsSection({ stats }: { stats: LiveStats }) {
  const hasAnyStats = Object.values(stats).some(
    (s) => s.home !== null || s.away !== null
  );

  if (!hasAnyStats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Estatísticas indisponíveis no momento</p>
          <p className="text-xs mt-1">As estatísticas aparecem após o início da partida</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Estatísticas ao Vivo
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <StatBar label="Posse de Bola" home={stats.possession.home} away={stats.possession.away} icon={<Radio className="h-3.5 w-3.5" />} isPercentage />
        <Separator className="my-1" />
        <StatBar label="Finalizações" home={stats.totalShots.home} away={stats.totalShots.away} icon={<Target className="h-3.5 w-3.5" />} />
        <StatBar label="Chutes no Gol" home={stats.shotsOnTarget.home} away={stats.shotsOnTarget.away} icon={<Target className="h-3.5 w-3.5" />} />
        <Separator className="my-1" />
        <StatBar label="Escanteios" home={stats.corners.home} away={stats.corners.away} icon={<CornerDownRight className="h-3.5 w-3.5" />} />
        <StatBar label="Ataques Perigosos" home={stats.dangerousAttacks.home} away={stats.dangerousAttacks.away} icon={<Zap className="h-3.5 w-3.5" />} />
        <Separator className="my-1" />
        <StatBar label="Faltas" home={stats.fouls.home} away={stats.fouls.away} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <StatBar label="Impedimentos" home={stats.offsides.home} away={stats.offsides.away} icon={<ChevronRight className="h-3.5 w-3.5" />} />
        <Separator className="my-1" />
        <StatBar label="Passes" home={stats.passes.home} away={stats.passes.away} icon={<ArrowRightLeft className="h-3.5 w-3.5" />} />
        <StatBar label="Precisão Passes" home={stats.passAccuracy.home} away={stats.passAccuracy.away} icon={<ArrowRightLeft className="h-3.5 w-3.5" />} isPercentage />
        <Separator className="my-1" />
        <StatBar label="Desarmes" home={stats.tackles.home} away={stats.tackles.away} icon={<Shield className="h-3.5 w-3.5" />} />
        <StatBar label="Defesas Goleiro" home={stats.gkSaves.home} away={stats.gkSaves.away} icon={<Shield className="h-3.5 w-3.5" />} />
      </CardContent>
    </Card>
  );
}

// ─── Events Timeline ───────────────────────────────────────────

function EventsTimeline({ events, homeTeamId }: { events: MatchEvent[]; homeTeamId: number }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum evento registrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Timeline de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-0">
          {events.map((event) => {
            const isHome = event.teamId === homeTeamId;
            const isGoalType = ['goal', 'own_goal', 'penalty'].includes(event.type);

            return (
              <div
                key={event.id}
                className={`flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0 ${
                  isGoalType ? 'bg-green-50/50 -mx-4 px-4 rounded-md' : ''
                }`}
              >
                {/* Minute */}
                <div className="w-12 shrink-0 text-right">
                  <span className="text-sm font-bold tabular-nums text-muted-foreground">
                    {event.minute}'
                    {event.extraMinute ? `+${event.extraMinute}` : ''}
                  </span>
                </div>

                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  <EventIcon type={event.type} />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isGoalType ? 'text-green-700' : ''}`}>
                      {event.playerName || eventLabel(event.type)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-4 ${isHome ? 'border-primary/30 text-primary' : 'border-muted-foreground/30'}`}
                    >
                      {isHome ? 'Casa' : 'Fora'}
                    </Badge>
                  </div>
                  {event.relatedPlayerName && event.type === 'substitution' && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Saiu: {event.relatedPlayerName}
                    </p>
                  )}
                  {event.relatedPlayerName && isGoalType && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assistência: {event.relatedPlayerName}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Projection Comparison Banner ─────────────────────────────

interface ProjectionData {
  analysisId: number;
  homeTeamName: string;
  awayTeamName: string;
  projectedHomeGoals: number;
  projectedAwayGoals: number;
  projections: {
    homeShots: number;
    awayShots: number;
    homeShotsOnTarget: number;
    awayShotsOnTarget: number;
    homeCorners: number;
    awayCorners: number;
    homeGoals: number;
    awayGoals: number;
  };
  rankingLines: {
    line: string;
    projection: number;
    baseline: number;
    confidenceIndex: number;
    category: string;
  }[];
  createdAt: string | Date;
}

type BadgeStatus = 'on-track' | 'attention' | 'off-track' | 'unavailable';

function getMarketStatus(
  label: string,
  projected: number,
  baseline: number,
  actual: number | null,
  minute: number | null,
): { status: BadgeStatus; actual: number | null; projected: number; baseline: number; progress: number } {
  if (actual === null) {
    return { status: 'unavailable', actual: null, projected, baseline, progress: 0 };
  }

  // Calculate expected progress based on minute (90 min match)
  const matchMinute = minute ?? 0;
  const expectedProgress = Math.min(matchMinute / 90, 1);
  const expectedAtThisPoint = baseline * expectedProgress;

  // If match is finished, compare directly
  if (matchMinute >= 85) {
    if (actual >= baseline) return { status: 'on-track', actual, projected, baseline, progress: actual / baseline };
    if (actual >= baseline * 0.8) return { status: 'attention', actual, projected, baseline, progress: actual / baseline };
    return { status: 'off-track', actual, projected, baseline, progress: actual / baseline };
  }

  // During the match: compare actual vs expected pace
  if (actual >= expectedAtThisPoint) {
    return { status: 'on-track', actual, projected, baseline, progress: actual / baseline };
  } else if (actual >= expectedAtThisPoint * 0.7) {
    return { status: 'attention', actual, projected, baseline, progress: actual / baseline };
  }
  return { status: 'off-track', actual, projected, baseline, progress: actual / baseline };
}

function ProjectionBanner({
  projection,
  stats,
  fixture,
}: {
  projection: ProjectionData;
  stats: LiveStats;
  fixture: LiveFixture;
}) {
  const isLive = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(fixture.state);
  const isFinished = ['FT', 'AET', 'PEN'].includes(fixture.state);
  const minute = fixture.minute;

  const homeTeamLower = projection.homeTeamName.toLowerCase();
  const awayTeamLower = projection.awayTeamName.toLowerCase();

  // Map live stats to ranking line values
  const getActualForLine = (lineName: string): number | null => {
    const lower = lineName.toLowerCase();

    if (lower.includes('total chutes no gol') || lower.includes('total finalizações no gol')) {
      const h = stats.shotsOnTarget.home;
      const a = stats.shotsOnTarget.away;
      if (h == null || a == null) return null;
      return h + a;
    }
    if (lower.includes('chutes no gol') || lower.includes('finalizações no gol')) {
      if (lower.includes(homeTeamLower)) return stats.shotsOnTarget.home;
      if (lower.includes(awayTeamLower)) return stats.shotsOnTarget.away;
      return null;
    }

    if (lower === 'total finalizações') {
      const h = stats.totalShots.home;
      const a = stats.totalShots.away;
      if (h == null || a == null) return null;
      return h + a;
    }
    if (lower.includes('finalizações')) {
      if (lower.includes(homeTeamLower)) return stats.totalShots.home;
      if (lower.includes(awayTeamLower)) return stats.totalShots.away;
      return null;
    }

    if (lower.includes('total escanteios')) {
      const h = stats.corners.home;
      const a = stats.corners.away;
      if (h == null || a == null) return null;
      return h + a;
    }
    if (lower.includes('escanteios')) {
      if (lower.includes(homeTeamLower)) return stats.corners.home;
      if (lower.includes(awayTeamLower)) return stats.corners.away;
      return null;
    }

    if (lower.includes('total gols')) {
      const hg = fixture.homeGoals;
      const ag = fixture.awayGoals;
      if (hg == null || ag == null) return null;
      return hg + ag;
    }
    if (lower.includes('gols')) {
      if (lower.includes(homeTeamLower)) return fixture.homeGoals;
      if (lower.includes(awayTeamLower)) return fixture.awayGoals;
      return null;
    }

    return null;
  };

  // Build market badges from ranking lines
  const marketBadges = projection.rankingLines.map((line) => {
    const actual = getActualForLine(line.line);
    const result = getMarketStatus(line.line, line.projection, line.baseline, actual, minute);
    return {
      ...result,
      label: line.line,
      category: line.category,
      confidence: line.confidenceIndex,
    };
  });

  // Also add main projection (total goals)
  const totalGoalsActual = (fixture.homeGoals ?? 0) + (fixture.awayGoals ?? 0);
  const totalGoalsProjected = projection.projectedHomeGoals + projection.projectedAwayGoals;
  const mainGoalStatus = getMarketStatus(
    'Total Gols',
    totalGoalsProjected,
    totalGoalsProjected - 0.5,
    isLive || isFinished ? totalGoalsActual : null,
    minute
  );

  const statusConfig = {
    'on-track': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: 'No caminho' },
    'attention': { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle, label: 'Atenção' },
    'off-track': { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Divergente' },
    'unavailable': { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: MinusCircle, label: 'Aguardando' },
  };

  const categoryLabels: Record<string, string> = {
    A: 'Escanteios',
    B: 'Finalizações',
    C: 'Chutes no Gol',
    D: 'Gols',
  };

  // Summary counts
  const onTrackCount = marketBadges.filter(b => b.status === 'on-track').length;
  const attentionCount = marketBadges.filter(b => b.status === 'attention').length;
  const offTrackCount = marketBadges.filter(b => b.status === 'off-track').length;
  const availableCount = marketBadges.filter(b => b.status !== 'unavailable').length;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Comparação com Projeção
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            Análise #{projection.analysisId}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main projection summary */}
        <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
          <div className="text-sm">
            <span className="text-muted-foreground">Placar projetado: </span>
            <span className="font-bold">
              {projection.homeTeamName} {projection.projectedHomeGoals} x {projection.projectedAwayGoals} {projection.awayTeamName}
            </span>
          </div>
          {(isLive || isFinished) && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[mainGoalStatus.status].color}`}>
              {(() => { const Icon = statusConfig[mainGoalStatus.status].icon; return <Icon className="h-3.5 w-3.5" />; })()}
              {statusConfig[mainGoalStatus.status].label}
            </div>
          )}
        </div>

        {/* Summary bar */}
        {availableCount > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Mercados:</span>
            {onTrackCount > 0 && (
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle2 className="h-3 w-3" /> {onTrackCount} no caminho
              </span>
            )}
            {attentionCount > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3 w-3" /> {attentionCount} atenção
              </span>
            )}
            {offTrackCount > 0 && (
              <span className="flex items-center gap-1 text-red-700">
                <XCircle className="h-3 w-3" /> {offTrackCount} divergente{offTrackCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Individual market badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {marketBadges.map((badge, idx) => {
            const config = statusConfig[badge.status];
            const Icon = config.icon;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${config.color}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{badge.label}</p>
                    <p className="text-[10px] opacity-75">
                      {categoryLabels[badge.category] || badge.category} • IC {badge.confidence.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {badge.actual !== null ? (
                    <>
                      <p className="font-bold">{badge.actual}</p>
                      <p className="text-[10px] opacity-75">linha {badge.baseline.toFixed(1)}</p>
                    </>
                  ) : (
                    <p className="text-[10px]">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {!isLive && !isFinished && (
          <p className="text-[10px] text-muted-foreground text-center">
            Os badges serão atualizados quando a partida iniciar
          </p>
        )}
        {isLive && (
          <p className="text-[10px] text-muted-foreground text-center">
            Comparação baseada no ritmo atual vs linha projetada • Atualiza a cada 30s
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Empty / No Selection State ────────────────────────────────

function EmptyState({ type }: { type: 'no-fixtures' | 'no-selection' }) {
  if (type === 'no-fixtures') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
        <WifiOff className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum jogo ao vivo</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Não há partidas sendo disputadas no momento nas ligas acompanhadas
          (Serie A, Serie B, Copa do Brasil, Premier League, Libertadores).
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Os jogos agendados para hoje aparecem na lista lateral.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
      <Radio className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Selecione uma partida</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Escolha um jogo na lista lateral para ver placar, estatísticas e eventos em tempo real.
      </p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function AoVivo() {
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [sidebarTab, setSidebarTab] = useState<'live' | 'upcoming' | 'finished'>('live');
  const [, navigate] = useLocation();

  // Save accuracy result mutation
  const saveAccuracyMutation = trpc.accuracy.saveResult.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.info('Resultado já salvo anteriormente');
      } else {
        toast.success('Resultado salvo no histórico de acurácia!', {
          action: { label: 'Ver Histórico', onClick: () => navigate('/acuracia') },
        });
      }
    },
    onError: () => toast.error('Erro ao salvar resultado'),
  });

  // Fetch today's fixtures
  const todayQuery = trpc.livescore.getTodayFixtures.useQuery(undefined, {
    refetchInterval: autoRefresh ? 30000 : false,
    refetchOnWindowFocus: true,
  });

  // Fetch selected match detail
  const detailQuery = trpc.livescore.getMatchDetail.useQuery(
    { fixtureId: selectedFixtureId! },
    {
      enabled: !!selectedFixtureId,
      refetchInterval: autoRefresh ? 30000 : false,
      refetchOnWindowFocus: true,
    }
  );

  // Fetch projection comparison for selected fixture
  const selectedFixture = useMemo(() => {
    if (!todayQuery.data || !selectedFixtureId) return null;
    const all = [...todayQuery.data.live, ...todayQuery.data.upcoming, ...todayQuery.data.finished];
    return all.find(f => f.id === selectedFixtureId) ?? null;
  }, [todayQuery.data, selectedFixtureId]);

  const projectionQuery = trpc.livescore.getProjectionComparison.useQuery(
    {
      homeTeamName: selectedFixture?.homeTeam.name ?? '',
      awayTeamName: selectedFixture?.awayTeam.name ?? '',
    },
    {
      enabled: !!selectedFixture,
      staleTime: 60000, // Cache for 1 minute
    }
  );

  // Update last refresh time
  useEffect(() => {
    if (todayQuery.dataUpdatedAt) {
      setLastRefresh(new Date(todayQuery.dataUpdatedAt));
    }
  }, [todayQuery.dataUpdatedAt]);

  // Auto-select first live fixture
  useEffect(() => {
    if (!selectedFixtureId && todayQuery.data) {
      const liveFixtures = todayQuery.data.live;
      if (liveFixtures.length > 0) {
        setSelectedFixtureId(liveFixtures[0].id);
        setSidebarTab('live');
      }
    }
  }, [todayQuery.data, selectedFixtureId]);

  const handleRefresh = useCallback(() => {
    todayQuery.refetch();
    if (selectedFixtureId) {
      detailQuery.refetch();
    }
    toast.success('Dados atualizados');
  }, [todayQuery, detailQuery, selectedFixtureId]);

  // Current tab fixtures
  const currentFixtures = useMemo(() => {
    if (!todayQuery.data) return [];
    switch (sidebarTab) {
      case 'live': return todayQuery.data.live;
      case 'upcoming': return todayQuery.data.upcoming;
      case 'finished': return todayQuery.data.finished;
    }
  }, [todayQuery.data, sidebarTab]);

  const liveCount = todayQuery.data?.live.length ?? 0;
  const upcomingCount = todayQuery.data?.upcoming.length ?? 0;
  const finishedCount = todayQuery.data?.finished.length ?? 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6rem)]">
      {/* ─── Left Sidebar: Fixture List ─── */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              Ao Vivo
            </h2>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    {autoRefresh ? (
                      <RefreshCw className="h-3.5 w-3.5 text-green-500 animate-spin" style={{ animationDuration: '3s' }} />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? 'Auto-refresh ativo (30s)' : 'Auto-refresh desativado'}
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => setSidebarTab('live')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                sidebarTab === 'live' ? 'bg-background shadow-sm text-red-600' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ao Vivo {liveCount > 0 && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{liveCount}</span>}
            </button>
            <button
              onClick={() => setSidebarTab('upcoming')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                sidebarTab === 'upcoming' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Próximos {upcomingCount > 0 && <span className="ml-1 text-[10px]">({upcomingCount})</span>}
            </button>
            <button
              onClick={() => setSidebarTab('finished')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                sidebarTab === 'finished' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Encerrados {finishedCount > 0 && <span className="ml-1 text-[10px]">({finishedCount})</span>}
            </button>
          </div>
        </div>

        {/* Fixture list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {todayQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : currentFixtures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                {sidebarTab === 'live'
                  ? 'Nenhum jogo ao vivo'
                  : sidebarTab === 'upcoming'
                    ? 'Nenhum jogo agendado'
                    : 'Nenhum jogo encerrado'}
              </p>
            </div>
          ) : (
            currentFixtures.map((f) => (
              <FixtureListItem
                key={f.id}
                fixture={f}
                isSelected={selectedFixtureId === f.id}
                onClick={() => setSelectedFixtureId(f.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t text-[10px] text-muted-foreground text-center">
          Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}
        </div>
      </div>

      {/* ─── Main Content: Match Detail ─── */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {!selectedFixtureId ? (
          <EmptyState type={liveCount === 0 && upcomingCount === 0 ? 'no-fixtures' : 'no-selection'} />
        ) : detailQuery.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : detailQuery.error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Erro ao carregar dados da partida</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => detailQuery.refetch()}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : detailQuery.data ? (
          <>
            {/* Match Header */}
            <MatchHeader fixture={detailQuery.data.fixture} />

            {/* Projection Comparison Banner */}
            {projectionQuery.data && (
              <>
                <ProjectionBanner
                  projection={projectionQuery.data}
                  stats={detailQuery.data.stats}
                  fixture={detailQuery.data.fixture}
                />
                {/* Save Result Button - only for finished matches */}
                {['FT', 'AET', 'PEN'].includes(detailQuery.data.fixture.state) && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      disabled={saveAccuracyMutation.isPending}
                      onClick={() => {
                        const proj = projectionQuery.data!;
                        const fixture = detailQuery.data!.fixture;
                        const stats = detailQuery.data!.stats;
                        saveAccuracyMutation.mutate({
                          analysisId: proj.analysisId,
                          fixtureId: fixture.id,
                          matchDate: fixture.startingAt.split('T')[0],
                          homeTeamName: fixture.homeTeam.name,
                          awayTeamName: fixture.awayTeam.name,
                          league: fixture.leagueName,
                          projectedHomeGoals: proj.projectedHomeGoals,
                          projectedAwayGoals: proj.projectedAwayGoals,
                          rankingLines: proj.rankingLines,
                          actualStats: {
                            homeGoals: fixture.homeGoals ?? 0,
                            awayGoals: fixture.awayGoals ?? 0,
                            homeShots: stats.totalShots.home ?? undefined,
                            awayShots: stats.totalShots.away ?? undefined,
                            homeCorners: stats.corners.home ?? undefined,
                            awayCorners: stats.corners.away ?? undefined,
                            homeShotsOnTarget: stats.shotsOnTarget.home ?? undefined,
                            awayShotsOnTarget: stats.shotsOnTarget.away ?? undefined,
                          },
                        });
                      }}
                    >
                      {saveAccuracyMutation.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Salvar Resultado no Histórico
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Stats + Events in 2-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <StatsSection stats={detailQuery.data.stats} />
              <EventsTimeline
                events={detailQuery.data.events}
                homeTeamId={detailQuery.data.fixture.homeTeam.id}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
