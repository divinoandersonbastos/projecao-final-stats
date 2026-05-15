import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, CheckCircle2, AlertTriangle, XCircle, Trophy, Loader2, Database, PenLine } from "lucide-react";

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

  // Fetch validation data
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {analysis.homeTeamName} x {analysis.awayTeamName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Projeção: {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Button
              variant={tabMode === "api" ? "default" : "outline"}
              size="sm"
              onClick={() => setTabMode("api")}
            >
              <Database className="h-4 w-4 mr-2" /> Buscar da API
            </Button>
            <Button
              variant={tabMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => setTabMode("manual")}
            >
              <PenLine className="h-4 w-4 mr-2" /> Inserir Manual
            </Button>
          </div>

          {tabMode === "api" ? (
            <ApiSearchTab analysisId={analysisId} analysis={analysis} onComplete={() => refetch()} />
          ) : (
            <ManualEntryTab analysisId={analysisId} analysis={analysis} onComplete={() => refetch()} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// API Search Tab
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

  const searchMutation = trpc.validation.searchFixtures.useMutation();
  const fetchMutation = trpc.validation.fetchAndSaveStats.useMutation();

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    try {
      const results = await searchMutation.mutateAsync({
        homeTeam: analysis.homeTeamName,
        awayTeam: analysis.awayTeamName,
      });
      setSearchResults(results);
      if (results.length === 0) {
        setError("Nenhuma partida encontrada. Tente inserir manualmente.");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao buscar partidas");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFixture = async (fixtureId: number) => {
    setIsFetching(true);
    setError(null);
    try {
      await fetchMutation.mutateAsync({ analysisId, fixtureId });
      onComplete();
    } catch (err: any) {
      setError(err.message || "Erro ao buscar estatísticas");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Busque a partida na API-Football para importar as estatísticas reais automaticamente.
      </p>

      <Button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        Buscar {analysis.homeTeamName} x {analysis.awayTeamName}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selecione a partida:</p>
          {searchResults.map((fixture) => (
            <div
              key={fixture.fixtureId}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium">
                  {fixture.homeTeam} {fixture.homeGoals ?? "?"} x {fixture.awayGoals ?? "?"}{" "}
                  {fixture.awayTeam}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(fixture.date).toLocaleDateString("pt-BR")} - {fixture.league} -{" "}
                  {fixture.status}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleSelectFixture(fixture.fixtureId)}
                disabled={isFetching}
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Selecionar"}
              </Button>
            </div>
          ))}
        </div>
      )}
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Insira os dados reais da partida manualmente. Gols são obrigatórios, demais campos são opcionais.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Goals - Required */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-3">{analysis.homeTeamName}</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-red-600">Gols *</label>
              <Input
                type="number"
                min={0}
                value={formData.homeGoals}
                onChange={(e) => updateRequiredField("homeGoals", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Finalizações</label>
              <Input
                type="number"
                min={0}
                value={formData.homeShots ?? ""}
                onChange={(e) => updateField("homeShots", e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Chutes no Gol</label>
              <Input
                type="number"
                min={0}
                value={formData.homeShotsOnTarget ?? ""}
                onChange={(e) => updateField("homeShotsOnTarget", e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Escanteios</label>
              <Input
                type="number"
                min={0}
                value={formData.homeCorners ?? ""}
                onChange={(e) => updateField("homeCorners", e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Posse de Bola (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.homePossession ?? ""}
                onChange={(e) => updateField("homePossession", e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">{analysis.awayTeamName}</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-red-600">Gols *</label>
              <Input
                type="number"
                min={0}
                value={formData.awayGoals}
                onChange={(e) => updateRequiredField("awayGoals", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Finalizações</label>
              <Input
                type="number"
                min={0}
                value={formData.awayShots ?? ""}
                onChange={(e) => updateField("awayShots", e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Chutes no Gol</label>
              <Input
                type="number"
                min={0}
                value={formData.awayShotsOnTarget ?? ""}
                onChange={(e) => updateField("awayShotsOnTarget", e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Escanteios</label>
              <Input
                type="number"
                min={0}
                value={formData.awayCorners ?? ""}
                onChange={(e) => updateField("awayCorners", e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Posse de Bola (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.awayPossession ?? ""}
                onChange={(e) => updateField("awayPossession", e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4 mr-2" />
        )}
        Salvar e Validar
      </Button>
    </div>
  );
}

// ============================================================
// Result Display Components
// ============================================================

function MatchHeader({ analysis, finalStats }: { analysis: any; finalStats: any }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Projeção</p>
            <p className="text-3xl font-bold">
              {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {analysis.homeTeamName} x {analysis.awayTeamName}
            </p>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-lg font-medium text-muted-foreground">vs</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Resultado Real</p>
            <p className="text-3xl font-bold text-blue-600">
              {finalStats?.homeGoals ?? "?"} x {finalStats?.awayGoals ?? "?"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {finalStats?.dataSource === "api-football" ? "Via API-Football" : "Inserido manualmente"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverallScore({ result }: { result: ValidationResultData }) {
  const score = parseFloat(result.overallScore);
  const classification = result.overallClassification;

  const classConfig = {
    excellent: { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: Trophy, label: "Excelente" },
    good: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: CheckCircle2, label: "Bom" },
    medium: { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", icon: AlertTriangle, label: "Médio" },
    divergent: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: XCircle, label: "Divergente" },
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
    excellent: "bg-green-100 text-green-800",
    good: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    divergent: "bg-red-100 text-red-800",
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
                <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
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
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
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
