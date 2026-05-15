import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trophy,
  Loader2,
  Database,
  PenLine,
  Radio,
  Calendar,
  RefreshCw,
  Zap,
  Shield,
} from "lucide-react";

type TabMode = "api" | "manual";

interface MetricValidation {
  metric: string;
  metricLabel: string;
  category: string;
  projected: number;
  actual: number;
  absoluteError: number;
  percentError: number;
  classification: "excellent" | "good" | "medium" | "divergent";
}

interface ValidationResultData {
  metricsValidation: MetricValidation[] | string;
  overallScore: string;
  overallClassification: "excellent" | "good" | "medium" | "divergent";
  avgAbsoluteError: string;
  avgPercentError: string;
  totalMetrics: number;
  excellentCount: number;
  goodCount: number;
  mediumCount: number;
  divergentCount: number;
}

export default function Validation() {
  const [, params] = useRoute("/validation/:id");
  const [, navigate] = useLocation();
  const analysisId = params?.id ? parseInt(params.id) : null;

  if (!analysisId) {
    return (
      <div className="p-6">
        <p>ID da análise não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/history")}>
          Voltar ao Histórico
        </Button>
      </div>
    );
  }

  return <ValidationContent analysisId={analysisId} />;
}

function ValidationContent({ analysisId }: { analysisId: number }) {
  const [, navigate] = useLocation();
  const [tabMode, setTabMode] = useState<TabMode>("api");

  const { data: validationData, isLoading, refetch } = trpc.validation.getResult.useQuery({
    analysisId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const analysis = validationData?.analysis;
  const finalStats = validationData?.finalStats;
  const validationResult = validationData?.validationResult as ValidationResultData | null;

  if (!analysis) {
    return (
      <div className="p-6">
        <p>Análise não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/history")}>
          Voltar ao Histórico
        </Button>
      </div>
    );
  }

  // If already validated, show results
  if (validationResult) {
    return (
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/history")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold">Validação Pós-Jogo</h1>
        </div>

        <MatchHeader analysis={analysis} finalStats={finalStats} />
        <StatsComparison analysis={analysis} finalStats={finalStats} />
        <OverallScore result={validationResult} />
        <MetricsTable result={validationResult} />
        <ClassificationBreakdown result={validationResult} />
      </div>
    );
  }

  // Show input form for validation
  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/history")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Validação Pós-Jogo</h1>
      </div>

      {/* Match Info Card */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="pt-6 pb-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-slate-400 uppercase tracking-wider">Projeção do Modelo</p>
            <div className="flex items-center justify-center gap-6">
              <div className="text-right">
                <p className="text-lg font-bold">{analysis.homeTeamName}</p>
                <p className="text-xs text-slate-400">Mandante</p>
              </div>
              <div className="text-4xl font-black text-amber-400">
                {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
              </div>
              <div className="text-left">
                <p className="text-lg font-bold">{analysis.awayTeamName}</p>
                <p className="text-xs text-slate-400">Visitante</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Selector */}
      <div className="flex gap-2">
        <Button
          variant={tabMode === "api" ? "default" : "outline"}
          onClick={() => setTabMode("api")}
          className="flex-1"
        >
          <Zap className="h-4 w-4 mr-2" /> Buscar Partida ao Vivo / Hoje
        </Button>
        <Button
          variant={tabMode === "manual" ? "default" : "outline"}
          onClick={() => setTabMode("manual")}
          className="flex-1"
        >
          <PenLine className="h-4 w-4 mr-2" /> Inserir Dados Manualmente
        </Button>
      </div>

      {tabMode === "api" ? (
        <ApiSearchTab analysisId={analysisId} analysis={analysis} onComplete={() => refetch()} />
      ) : (
        <ManualEntryTab analysisId={analysisId} analysis={analysis} onComplete={() => refetch()} />
      )}
    </div>
  );
}

// ============================================================
// API Search Tab - Live/Today fixtures
// ============================================================

function ApiSearchTab({
  analysisId,
  analysis,
  onComplete,
}: {
  analysisId: number;
  analysis: any;
  onComplete: () => void;
}) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchMode, setSearchMode] = useState<"live" | "date" | "team" | "fixtureId">("live");
  const [fixtureIdInput, setFixtureIdInput] = useState("");
  const [fetchingFixtureId, setFetchingFixtureId] = useState<number | null>(null);

  const searchMutation = trpc.validation.searchFixtures.useMutation();

  const handleSearchLive = async () => {
    setIsSearching(true);
    setError(null);
    setSearchMode("live");
    try {
      // Search by team name (includes live + today)
      const results = await searchMutation.mutateAsync({
        homeTeam: analysis.homeTeamName,
        awayTeam: analysis.awayTeamName,
      });
      setSearchResults(results);
      if (results.length === 0) {
        setError("Nenhuma partida encontrada ao vivo ou hoje. Tente buscar por data ou inserir manualmente.");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao buscar partidas");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchByDate = async () => {
    setIsSearching(true);
    setError(null);
    setSearchMode("date");
    try {
      const results = await searchMutation.mutateAsync({
        homeTeam: analysis.homeTeamName,
        awayTeam: analysis.awayTeamName,
        date: searchDate,
      });
      setSearchResults(results);
      if (results.length === 0) {
        setError(`Nenhuma partida de ${analysis.homeTeamName} encontrada em ${formatDate(searchDate)}.`);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao buscar partidas");
    } finally {
      setIsSearching(false);
    }
  };

  // handleSelectFixture is handled by FixtureCard component directly

  return (
    <div className="space-y-4">
      {/* Search Options */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSearchLive}
              disabled={isSearching}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSearching && searchMode === "live" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Radio className="h-4 w-4 mr-2" />
              )}
              Buscar Ao Vivo / Hoje
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou buscar por data</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSearchByDate}
              disabled={isSearching}
              variant="outline"
            >
              {isSearching && searchMode === "date" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou buscar por ID da partida</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              value={fixtureIdInput}
              onChange={(e) => setFixtureIdInput(e.target.value)}
              placeholder="Ex: 1180728"
              className="flex-1"
            />
            <Button
              onClick={async () => {
                if (!fixtureIdInput) return;
                setIsFetching(true);
                setFetchingFixtureId(parseInt(fixtureIdInput));
                setError(null);
                setSearchMode("fixtureId");
                try {
                  const fetchMut = trpc.validation.fetchAndSaveStats.useMutation;
                  // We use the FixtureCard approach - just set the fixture as a result
                  setSearchResults([{
                    fixtureId: parseInt(fixtureIdInput),
                    homeTeam: analysis.homeTeamName,
                    awayTeam: analysis.awayTeamName,
                    homeGoals: null,
                    awayGoals: null,
                    date: new Date().toISOString(),
                    league: "Busca por ID",
                    status: "Verificando...",
                    statusShort: "FT",
                    elapsed: null,
                  }]);
                } finally {
                  setIsFetching(false);
                  setFetchingFixtureId(null);
                }
              }}
              disabled={isSearching || !fixtureIdInput}
              variant="outline"
            >
              <Database className="h-4 w-4 mr-2" />
              Buscar por ID
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Buscando partidas de <strong>{analysis.homeTeamName}</strong> x <strong>{analysis.awayTeamName}</strong>.
            A API retorna partidas ao vivo e do dia selecionado. Ou insira o ID da partida diretamente.
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm dark:bg-red-950 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              {searchResults.length} partida(s) encontrada(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.map((fixture) => (
              <FixtureCard
                key={fixture.fixtureId}
                fixture={fixture}
                analysisId={analysisId}
                isFetching={isFetching && fetchingFixtureId === fixture.fixtureId}
                disabled={isFetching}
                onComplete={onComplete}
                onError={(msg) => setError(msg)}
                onFetchStart={() => { setIsFetching(true); setFetchingFixtureId(fixture.fixtureId); setError(null); }}
                onFetchEnd={() => { setIsFetching(false); setFetchingFixtureId(null); }}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FixtureCard({
  fixture,
  analysisId,
  isFetching,
  disabled,
  onComplete,
  onError,
  onFetchStart,
  onFetchEnd,
}: {
  fixture: any;
  analysisId: number;
  isFetching: boolean;
  disabled: boolean;
  onComplete: () => void;
  onError: (msg: string) => void;
  onFetchStart: () => void;
  onFetchEnd: () => void;
}) {
  const fetchMutation = trpc.validation.fetchAndSaveStats.useMutation();

  const isLive = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(fixture.statusShort);
  const isFinished = ["FT", "AET", "PEN"].includes(fixture.statusShort);
  const isScheduled = ["NS", "TBD"].includes(fixture.statusShort);

  const handleSelect = async () => {
    onFetchStart();
    try {
      await fetchMutation.mutateAsync({ analysisId, fixtureId: fixture.fixtureId });
      onComplete();
    } catch (err: any) {
      onError(err.message || "Erro ao buscar estatísticas");
    } finally {
      onFetchEnd();
    }
  };

  const statusBadge = () => {
    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
          <Radio className="h-3 w-3" /> AO VIVO {fixture.elapsed ? `${fixture.elapsed}'` : ""}
        </span>
      );
    }
    if (isFinished) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3" /> Encerrado
        </span>
      );
    }
    if (isScheduled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
          <Calendar className="h-3 w-3" /> {new Date(fixture.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
        {fixture.status}
      </span>
    );
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
      isLive ? "border-red-300 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800" :
      isFinished ? "border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800" :
      "hover:bg-gray-50 dark:hover:bg-gray-800/50"
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          {fixture.homeTeamLogo && (
            <img src={fixture.homeTeamLogo} alt="" className="h-6 w-6 object-contain" />
          )}
          <span className="font-semibold">{fixture.homeTeam}</span>
          <span className="text-xl font-black">
            {fixture.homeGoals ?? "-"} x {fixture.awayGoals ?? "-"}
          </span>
          <span className="font-semibold">{fixture.awayTeam}</span>
          {fixture.awayTeamLogo && (
            <img src={fixture.awayTeamLogo} alt="" className="h-6 w-6 object-contain" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {fixture.leagueLogo && (
            <img src={fixture.leagueLogo} alt="" className="h-4 w-4 object-contain" />
          )}
          <span>{fixture.league}</span>
          <span>•</span>
          <span>{formatDate(fixture.date)}</span>
          <span>•</span>
          {statusBadge()}
        </div>
      </div>
      <div className="ml-4">
        {isFinished ? (
          <Button
            size="sm"
            onClick={handleSelect}
            disabled={disabled}
            className="bg-green-600 hover:bg-green-700"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar com estes dados"}
          </Button>
        ) : isLive ? (
          <Button size="sm" variant="outline" disabled className="text-red-600 border-red-300">
            Aguarde o fim do jogo
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled className="text-gray-400">
            Ainda não começou
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Manual Entry Tab
// ============================================================

function ManualEntryTab({
  analysisId,
  analysis,
  onComplete,
}: {
  analysisId: number;
  analysis: any;
  onComplete: () => void;
}) {
  const [formData, setFormData] = useState({
    homeGoals: 0,
    awayGoals: 0,
    homeShots: undefined as number | undefined,
    awayShots: undefined as number | undefined,
    homeShotsOnTarget: undefined as number | undefined,
    awayShotsOnTarget: undefined as number | undefined,
    homeCorners: undefined as number | undefined,
    awayCorners: undefined as number | undefined,
    homeDangerousAttacks: undefined as number | undefined,
    awayDangerousAttacks: undefined as number | undefined,
    homePossession: undefined as number | undefined,
    awayPossession: undefined as number | undefined,
    homeXg: undefined as number | undefined,
    awayXg: undefined as number | undefined,
    homeFouls: undefined as number | undefined,
    awayFouls: undefined as number | undefined,
    homePasses: undefined as number | undefined,
    awayPasses: undefined as number | undefined,
    homeTackles: undefined as number | undefined,
    awayTackles: undefined as number | undefined,
    homeGkSaves: undefined as number | undefined,
    awayGkSaves: undefined as number | undefined,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = trpc.validation.saveManualStats.useMutation();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveMutation.mutateAsync({
        analysisId,
        ...formData,
      });
      onComplete();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    const num = value === "" ? undefined : parseFloat(value);
    setFormData((prev) => ({ ...prev, [field]: num }));
  };

  const updateRequiredField = (field: string, value: string) => {
    const num = parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [field]: num }));
  };

  const statFields = [
    { key: "Goals", label: "Gols", required: true, homeKey: "homeGoals", awayKey: "awayGoals" },
    { key: "Shots", label: "Finalizações", required: false, homeKey: "homeShots", awayKey: "awayShots" },
    { key: "ShotsOnTarget", label: "Chutes ao Gol", required: false, homeKey: "homeShotsOnTarget", awayKey: "awayShotsOnTarget" },
    { key: "Corners", label: "Escanteios", required: false, homeKey: "homeCorners", awayKey: "awayCorners" },
    { key: "DangerousAttacks", label: "Ataques Perigosos", required: false, homeKey: "homeDangerousAttacks", awayKey: "awayDangerousAttacks" },
    { key: "Possession", label: "Posse de Bola (%)", required: false, homeKey: "homePossession", awayKey: "awayPossession", max: 100 },
    { key: "Xg", label: "xG", required: false, homeKey: "homeXg", awayKey: "awayXg", step: "0.01" },
    { key: "Fouls", label: "Faltas", required: false, homeKey: "homeFouls", awayKey: "awayFouls" },
    { key: "Passes", label: "Passes", required: false, homeKey: "homePasses", awayKey: "awayPasses" },
    { key: "Tackles", label: "Desarmes", required: false, homeKey: "homeTackles", awayKey: "awayTackles" },
    { key: "GkSaves", label: "Defesas do Goleiro", required: false, homeKey: "homeGkSaves", awayKey: "awayGkSaves" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PenLine className="h-4 w-4" />
          Inserir Dados Reais da Partida
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Insira as estatísticas finais conforme exibidas no site de estatísticas (CraqueStats, SofaScore, etc).
          Gols são obrigatórios, demais campos são opcionais.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm dark:bg-red-950 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Stats Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-center py-3 px-2 w-32">{analysis.homeTeamName}</th>
                <th className="text-center py-3 px-2">Estatística</th>
                <th className="text-center py-3 px-2 w-32">{analysis.awayTeamName}</th>
              </tr>
            </thead>
            <tbody>
              {statFields.map((field) => (
                <tr key={field.key} className="border-b">
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min={0}
                      max={field.max}
                      step={field.step || "1"}
                      value={field.required ? (formData as any)[field.homeKey] : ((formData as any)[field.homeKey] ?? "")}
                      onChange={(e) =>
                        field.required
                          ? updateRequiredField(field.homeKey, e.target.value)
                          : updateField(field.homeKey, e.target.value)
                      }
                      placeholder={field.required ? "0" : "-"}
                      className="text-center"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`text-sm ${field.required ? "font-bold text-red-600" : "text-muted-foreground"}`}>
                      {field.label} {field.required ? "*" : ""}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min={0}
                      max={field.max}
                      step={field.step || "1"}
                      value={field.required ? (formData as any)[field.awayKey] : ((formData as any)[field.awayKey] ?? "")}
                      onChange={(e) =>
                        field.required
                          ? updateRequiredField(field.awayKey, e.target.value)
                          : updateField(field.awayKey, e.target.value)
                      }
                      placeholder={field.required ? "0" : "-"}
                      className="text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Salvar e Validar
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Result Display Components
// ============================================================

function MatchHeader({ analysis, finalStats }: { analysis: any; finalStats: any }) {
  return (
    <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 overflow-hidden">
      <CardContent className="pt-6 pb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Projeção do Modelo</p>
            <p className="text-4xl font-black text-amber-400">
              {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
            </p>
            <p className="text-sm text-slate-300 mt-2">
              {analysis.homeTeamName} x {analysis.awayTeamName}
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-300">VS</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Resultado Real</p>
            <p className="text-4xl font-black text-emerald-400">
              {finalStats?.homeGoals ?? "?"} x {finalStats?.awayGoals ?? "?"}
            </p>
            <p className="text-sm text-slate-300 mt-2">
              {finalStats?.dataSource === "api-football" ? "Via API-Football" : "Inserido manualmente"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsComparison({ analysis, finalStats }: { analysis: any; finalStats: any }) {
  if (!finalStats) return null;

  const stats = [
    {
      label: "Posse de Bola",
      homeValue: finalStats.homePossession,
      awayValue: finalStats.awayPossession,
      suffix: "%",
      isBar: true,
    },
    {
      label: "Finalizações",
      homeValue: finalStats.homeShots,
      awayValue: finalStats.awayShots,
    },
    {
      label: "Chutes ao Gol",
      homeValue: finalStats.homeShotsOnTarget,
      awayValue: finalStats.awayShotsOnTarget,
    },
    {
      label: "Escanteios",
      homeValue: finalStats.homeCorners,
      awayValue: finalStats.awayCorners,
    },
    {
      label: "Ataques Perigosos",
      homeValue: finalStats.homeDangerousAttacks,
      awayValue: finalStats.awayDangerousAttacks,
    },
    {
      label: "Defesas do Goleiro",
      homeValue: finalStats.homeGkSaves,
      awayValue: finalStats.awayGkSaves,
    },
    {
      label: "Faltas",
      homeValue: finalStats.homeFouls,
      awayValue: finalStats.awayFouls,
    },
    {
      label: "Passes",
      homeValue: finalStats.homePasses,
      awayValue: finalStats.awayPasses,
    },
    {
      label: "Desarmes",
      homeValue: finalStats.homeTackles,
      awayValue: finalStats.awayTackles,
    },
  ].filter((s) => s.homeValue != null || s.awayValue != null);

  if (stats.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Visão Geral da Partida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat) => {
          const home = stat.homeValue ?? 0;
          const away = stat.awayValue ?? 0;
          const total = home + away || 1;
          const homePercent = (home / total) * 100;
          const awayPercent = (away / total) * 100;

          if (stat.isBar) {
            return (
              <div key={stat.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-blue-600">{home}{stat.suffix || ""}</span>
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-bold text-emerald-600">{away}{stat.suffix || ""}</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                  <div
                    className="bg-blue-500 transition-all duration-700"
                    style={{ width: `${home}%` }}
                  />
                  <div
                    className="bg-emerald-500 transition-all duration-700"
                    style={{ width: `${away}%` }}
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={stat.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-bold w-8 text-center">{home}</span>
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="font-bold w-8 text-center">{away}</span>
              </div>
              <div className="flex h-2 gap-1">
                <div className="flex-1 flex justify-end">
                  <div
                    className="bg-blue-400 rounded-l-full transition-all duration-700"
                    style={{ width: `${homePercent}%` }}
                  />
                </div>
                <div className="flex-1">
                  <div
                    className="bg-emerald-400 rounded-r-full transition-all duration-700"
                    style={{ width: `${awayPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function OverallScore({ result }: { result: ValidationResultData }) {
  const score = parseFloat(result.overallScore);
  const classification = result.overallClassification;

  const classConfig = {
    excellent: { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", icon: Trophy, label: "Excelente" },
    good: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", icon: CheckCircle2, label: "Bom" },
    medium: { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800", icon: AlertTriangle, label: "Médio" },
    divergent: { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", icon: XCircle, label: "Divergente" },
  };

  const config = classConfig[classification];
  const Icon = config.icon;

  return (
    <Card className={`${config.bg} ${config.border} border-2`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Icon className={`h-12 w-12 ${config.color}`} />
            <div>
              <h2 className="text-2xl font-bold">Score Geral do Modelo</h2>
              <p className="text-muted-foreground">
                Erro médio: {parseFloat(result.avgPercentError).toFixed(1)}% |{" "}
                {result.totalMetrics} métricas avaliadas
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-5xl font-bold ${config.color}`}>{score.toFixed(0)}</p>
            <p className={`text-lg font-semibold ${config.color}`}>{config.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricsTable({ result }: { result: ValidationResultData }) {
  const metrics: MetricValidation[] =
    typeof result.metricsValidation === "string"
      ? JSON.parse(result.metricsValidation)
      : result.metricsValidation;

  const classColors = {
    excellent: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    good: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    divergent: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };

  const classLabels = {
    excellent: "Excelente",
    good: "Bom",
    medium: "Médio",
    divergent: "Divergente",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação por Métrica</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Métrica</th>
                <th className="text-center py-3 px-2">Projeção</th>
                <th className="text-center py-3 px-2">Real</th>
                <th className="text-center py-3 px-2">Erro Abs.</th>
                <th className="text-center py-3 px-2">Erro %</th>
                <th className="text-center py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2 font-medium">{m.metricLabel}</td>
                  <td className="text-center py-3 px-2">{m.projected.toFixed(2)}</td>
                  <td className="text-center py-3 px-2 font-semibold">{m.actual}</td>
                  <td className="text-center py-3 px-2">{m.absoluteError.toFixed(2)}</td>
                  <td className="text-center py-3 px-2">{Math.abs(m.percentError).toFixed(1)}%</td>
                  <td className="text-center py-3 px-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${classColors[m.classification]}`}
                    >
                      {classLabels[m.classification]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassificationBreakdown({ result }: { result: ValidationResultData }) {
  const total = result.totalMetrics;
  const items = [
    { label: "Excelente (≤10%)", count: result.excellentCount, color: "bg-green-500" },
    { label: "Bom (10-20%)", count: result.goodCount, color: "bg-blue-500" },
    { label: "Médio (20-35%)", count: result.mediumCount, color: "bg-yellow-500" },
    { label: "Divergente (>35%)", count: result.divergentCount, color: "bg-red-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição das Classificações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-sm w-40">{item.label}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                <div
                  className={`${item.color} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                  style={{ width: total > 0 ? `${(item.count / total) * 100}%` : "0%" }}
                >
                  {item.count > 0 && (
                    <span className="text-xs text-white font-semibold">{item.count}</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium w-12 text-right">
                {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
