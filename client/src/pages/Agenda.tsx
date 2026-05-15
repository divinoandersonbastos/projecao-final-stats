import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BarChart3,
  ClipboardCheck,
  Zap,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type FixtureStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled" | "unknown";
type FilterTab = FixtureStatus | "all";

interface AgendaFixture {
  apiFixtureId: number;
  date: string;
  time: string;
  timezone: string;
  country: string;
  countryCode: string | null;
  league: string;
  leagueId: number;
  season: number | null;
  round: string | null;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureStatus;
  statusShort: string;
  elapsed: number | null;
}

interface LeagueGroupData {
  country: string;
  countryCode: string | null;
  league: string;
  leagueId: number;
  fixtures: AgendaFixture[];
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<FixtureStatus, { label: string; color: string; icon: typeof Clock; bgClass: string }> = {
  scheduled: { label: "Agendado", color: "text-slate-500", icon: Clock, bgClass: "bg-slate-100 text-slate-700" },
  live: { label: "Ao Vivo", color: "text-green-600", icon: Play, bgClass: "bg-green-100 text-green-700" },
  halftime: { label: "Intervalo", color: "text-yellow-600", icon: Clock, bgClass: "bg-yellow-100 text-yellow-700" },
  finished: { label: "Finalizado", color: "text-emerald-700", icon: CheckCircle2, bgClass: "bg-emerald-100 text-emerald-700" },
  postponed: { label: "Adiado", color: "text-orange-600", icon: AlertTriangle, bgClass: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Cancelado", color: "text-red-600", icon: XCircle, bgClass: "bg-red-100 text-red-700" },
  unknown: { label: "Indefinido", color: "text-gray-500", icon: HelpCircle, bgClass: "bg-gray-100 text-gray-700" },
};

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Agendados" },
  { value: "live", label: "Ao Vivo" },
  { value: "halftime", label: "Intervalo" },
  { value: "finished", label: "Finalizados" },
];

// ─── Calendar Sidebar ────────────────────────────────────────────────────────

function CalendarSidebar({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();

  const prevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    onDateChange(t);
  };

  const selectDay = (day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    d.setHours(0, 0, 0, 0);
    onDateChange(d);
  };

  const monthName = viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const isSelected = (day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    return d.toDateString() === selectedDate.toDateString();
  };

  const isToday = (day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    return d.toDateString() === today.toDateString();
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">{monthName}</span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-xs mb-1">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span key={i} className="text-muted-foreground font-medium py-1">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            return (
              <button
                key={day}
                onClick={() => selectDay(day)}
                className={`
                  h-7 w-7 rounded-md flex items-center justify-center transition-all text-xs
                  ${isSelected(day) ? "bg-primary text-primary-foreground font-bold" : ""}
                  ${isToday(day) && !isSelected(day) ? "ring-1 ring-primary text-primary font-semibold" : ""}
                  ${!isSelected(day) && !isToday(day) ? "hover:bg-accent" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={goToToday}>
          <Calendar className="h-3 w-3 mr-1" />
          Hoje
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Status Filter Tabs ──────────────────────────────────────────────────────

function StatusFilterTabs({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: Record<FilterTab, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTER_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${activeTab === tab.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }
          `}
        >
          {tab.label}
          {counts[tab.value] > 0 && (
            <span className="ml-1.5 opacity-75">({counts[tab.value]})</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Fixture Status Badge ────────────────────────────────────────────────────

function FixtureStatusBadge({ status, elapsed }: { status: FixtureStatus; elapsed: number | null }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={`${config.bgClass} text-[10px] gap-0.5 px-1.5 py-0.5`}>
      {status === "live" && <span className="relative flex h-1.5 w-1.5 mr-0.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600"></span></span>}
      {status !== "live" && <Icon className="h-2.5 w-2.5" />}
      {config.label}
      {elapsed && (status === "live" || status === "halftime") && <span className="ml-0.5">{elapsed}'</span>}
    </Badge>
  );
}

// ─── Fixture Card ────────────────────────────────────────────────────────────

function FixtureCard({
  fixture,
  onCreateAnalysis,
  onValidate,
}: {
  fixture: AgendaFixture;
  onCreateAnalysis: (f: AgendaFixture) => void;
  onValidate: (f: AgendaFixture) => void;
}) {
  const isLive = fixture.status === "live" || fixture.status === "halftime";
  const isFinished = fixture.status === "finished";

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${isLive ? "border-green-300 bg-green-50/50 dark:bg-green-950/20" : ""}
        ${isFinished ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10" : ""}
        ${!isLive && !isFinished ? "border-border hover:border-primary/30 hover:bg-accent/30" : ""}
      `}
    >
      {/* Time */}
      <div className="text-center w-12 shrink-0">
        <span className="text-sm font-semibold text-foreground">{fixture.time}</span>
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {fixture.homeLogo && (
            <img src={fixture.homeLogo} alt="" className="h-4 w-4 object-contain" />
          )}
          <span className="text-sm font-medium truncate">{fixture.homeTeam}</span>
          {isFinished || isLive ? (
            <span className="text-sm font-bold ml-auto">{fixture.homeScore ?? "-"}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {fixture.awayLogo && (
            <img src={fixture.awayLogo} alt="" className="h-4 w-4 object-contain" />
          )}
          <span className="text-sm font-medium truncate">{fixture.awayTeam}</span>
          {isFinished || isLive ? (
            <span className="text-sm font-bold ml-auto">{fixture.awayScore ?? "-"}</span>
          ) : null}
        </div>
      </div>

      {/* Status + Actions */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <FixtureStatusBadge status={fixture.status} elapsed={fixture.elapsed} />
        <div className="flex gap-1">
          {(fixture.status === "scheduled" || isLive) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Criar análise"
              onClick={() => onCreateAnalysis(fixture)}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
          )}
          {isFinished && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Validar pós-jogo"
              onClick={() => onValidate(fixture)}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── League Group ────────────────────────────────────────────────────────────

function LeagueGroup({
  group,
  onCreateAnalysis,
  onValidate,
}: {
  group: LeagueGroupData;
  onCreateAnalysis: (f: AgendaFixture) => void;
  onValidate: (f: AgendaFixture) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        {group.countryCode && (
          <img src={group.countryCode} alt="" className="h-4 w-4 object-contain rounded-sm" />
        )}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {group.country}
        </span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs font-medium text-foreground">{group.league}</span>
      </div>
      <div className="space-y-1.5">
        {group.fixtures.map((fixture) => (
          <FixtureCard
            key={fixture.apiFixtureId}
            fixture={fixture}
            onCreateAnalysis={onCreateAnalysis}
            onValidate={onValidate}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Agenda Page ────────────────────────────────────────────────────────

export default function Agenda() {
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const dateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const { data, isLoading, error } = trpc.agenda.getByDate.useQuery({ date: dateStr });
  const syncMutation = trpc.agenda.sync.useMutation();
  const utils = trpc.useUtils();

  const handleSync = async () => {
    await syncMutation.mutateAsync({ date: dateStr });
    utils.agenda.getByDate.invalidate({ date: dateStr });
  };

  // Filter and search
  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];

    let allFixtures = data.groups.flatMap((g) => g.fixtures);

    // Filter by status
    if (activeFilter !== "all") {
      allFixtures = allFixtures.filter((f) => f.status === activeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const normalized = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      allFixtures = allFixtures.filter((f) => {
        const fields = [f.homeTeam, f.awayTeam, f.league, f.country];
        return fields.some((field) =>
          field.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalized)
        );
      });
    }

    // Re-group
    const groups = new Map<string, LeagueGroupData>();
    for (const fixture of allFixtures) {
      const key = `${fixture.country}|${fixture.leagueId}`;
      if (!groups.has(key)) {
        const original = data.groups.find((g) => g.leagueId === fixture.leagueId && g.country === fixture.country);
        groups.set(key, {
          country: fixture.country,
          countryCode: original?.countryCode || fixture.countryCode,
          league: fixture.league,
          leagueId: fixture.leagueId,
          fixtures: [],
        });
      }
      groups.get(key)!.fixtures.push(fixture);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const countryCompare = a.country.localeCompare(b.country);
      if (countryCompare !== 0) return countryCompare;
      return a.league.localeCompare(b.league);
    });
  }, [data, activeFilter, searchQuery]);

  // Count fixtures by status
  const counts = useMemo(() => {
    const c: Record<FilterTab, number> = { all: 0, scheduled: 0, live: 0, halftime: 0, finished: 0, postponed: 0, cancelled: 0, unknown: 0 };
    if (!data?.fixtures) return c;
    c.all = data.fixtures.length;
    for (const f of data.fixtures) {
      c[f.status] = (c[f.status] || 0) + 1;
    }
    return c;
  }, [data]);

  const handleCreateAnalysis = (fixture: AgendaFixture) => {
    // Store fixture data in sessionStorage and navigate to new analysis
    sessionStorage.setItem("agendaFixture", JSON.stringify({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      date: fixture.date,
      league: fixture.league,
      country: fixture.country,
      fixtureId: fixture.apiFixtureId,
    }));
    navigate("/new");
  };

  const handleValidate = (fixture: AgendaFixture) => {
    // Navigate to validation with fixture info
    sessionStorage.setItem("validateFixture", JSON.stringify({
      fixtureId: fixture.apiFixtureId,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
    }));
    navigate("/history");
  };

  const formattedDate = selectedDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Agenda dos Jogos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{formattedDate}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Layout: Calendar + Content */}
      <div className="flex gap-4">
        {/* Sidebar: Calendar */}
        <div className="w-64 shrink-0 hidden lg:block">
          <CalendarSidebar selectedDate={selectedDate} onDateChange={setSelectedDate} />

          {/* Quick stats */}
          {data && (
            <Card className="mt-3">
              <CardContent className="p-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de jogos</span>
                    <span className="font-semibold">{data.total}</span>
                  </div>
                  {counts.live > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-600 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Ao vivo
                      </span>
                      <span className="font-semibold text-green-600">{counts.live}</span>
                    </div>
                  )}
                  {counts.finished > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Finalizados</span>
                      <span className="font-semibold">{counts.finished}</span>
                    </div>
                  )}
                  {data.fromCache && (
                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                      Dados em cache. Clique "Atualizar" para buscar ao vivo.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile Calendar */}
          <div className="lg:hidden mb-4">
            <CalendarSidebar selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>

          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <StatusFilterTabs activeTab={activeFilter} onTabChange={setActiveFilter} counts={counts} />
            <div className="relative sm:ml-auto sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar time, liga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando agenda...</span>
            </div>
          ) : error || data?.error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {data?.error || "Erro ao carregar a agenda. Tente novamente."}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={handleSync}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Nenhum jogo encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery
                    ? "Tente ajustar sua busca."
                    : activeFilter !== "all"
                    ? "Nenhum jogo com esse status nesta data."
                    : "Não há jogos agendados para esta data."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <LeagueGroup
                  key={`${group.country}-${group.leagueId}`}
                  group={group}
                  onCreateAnalysis={handleCreateAnalysis}
                  onValidate={handleValidate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
