import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { RankingLine } from "@/types/analysis";
import { useMemo } from "react";

export default function AnalysisDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/dashboard/analysis/:id");
  const analysisId = params?.id ? parseInt(params.id) : null;

  const { data: analysis, isLoading } = trpc.analysis.getById.useQuery(
    { id: analysisId! },
    { enabled: !!analysisId }
  );

  const rankingLines = useMemo(() => {
    if (!analysis || !analysis.rankingData) return [];
    return (analysis.rankingData as unknown as RankingLine[]).sort(
      (a, b) => b.confidenceIndex - a.confidenceIndex
    );
  }, [analysis]);

  const cornerLines = rankingLines.filter((line) => line.category === "A");
  const shotLines = rankingLines.filter((line) => line.category === "B");
  const shotOnTargetLines = rankingLines.filter((line) => line.category === "C");
  const goalLines = rankingLines.filter((line) => line.category === "D");

  const getStatusBadge = (status: string) => {
    const badgeClasses: Record<string, string> = {
      Forte: "badge-strong",
      Boa: "badge-good",
      Média: "badge-medium",
      Fraca: "badge-weak",
      "Sem sustentação": "badge-alert",
    };
    return badgeClasses[status] || "badge-medium";
  };

  const getStabilityBadge = (stability: string) => {
    const badgeClasses: Record<string, string> = {
      Alta: "bg-green-100 text-green-800",
      Média: "bg-yellow-100 text-yellow-800",
      Baixa: "bg-red-100 text-red-800",
    };
    return badgeClasses[stability] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-8">
        <Button variant="outline" onClick={() => navigate("/dashboard/history")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Card className="p-12 bg-card border border-border text-center">
          <p className="text-muted-foreground">Análise não encontrada</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => navigate("/dashboard/history")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">
          {analysis.homeTeamName} x {analysis.awayTeamName}
        </h1>
        <p className="text-muted-foreground">
          Modo: {analysis.analysisMode === "mode1" ? "Geral" : "Mandante x Visitante"}
        </p>
      </div>

      {/* Dados Extraídos */}
      <Card className="p-6 bg-card border border-border">
        <h2 className="text-2xl font-bold mb-6">Dados Extraídos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">{analysis.homeTeamName}</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Ataques perigosos:</strong> {analysis.homeTeamName} a favor | {analysis.homeTeamName} contra
              </p>
              <p>
                <strong>Escanteios:</strong> {Number(analysis.homeProjectedCorners).toFixed(2)} a favor | {Number(analysis.homeProjectedCorners).toFixed(2)} contra
              </p>
              <p>
                <strong>Finalizações:</strong> {Number(analysis.homeProjectedShots).toFixed(2)} a favor | {Number(analysis.homeProjectedShots).toFixed(2)} contra
              </p>
              <p>
                <strong>Finalizações no gol:</strong> {Number(analysis.homeProjectedShotsOnTarget).toFixed(2)} a favor | {Number(analysis.homeProjectedShotsOnTarget).toFixed(2)} contra
              </p>
              <p>
                <strong>Gols:</strong> {Number(analysis.homeProjectedGoals).toFixed(2)} a favor | {Number(analysis.homeProjectedGoals).toFixed(2)} contra
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{analysis.awayTeamName}</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Ataques perigosos:</strong> {analysis.awayTeamName} a favor | {analysis.awayTeamName} contra
              </p>
              <p>
                <strong>Escanteios:</strong> {analysis.awayTeamName} a favor | {analysis.awayTeamName} contra
              </p>
              <p>
                <strong>Finalizações:</strong> {Number(analysis.awayProjectedShots).toFixed(2)} a favor | {Number(analysis.awayProjectedShots).toFixed(2)} contra
              </p>
              <p>
                <strong>Finalizações no gol:</strong> {Number(analysis.awayProjectedShotsOnTarget).toFixed(2)} a favor | {Number(analysis.awayProjectedShotsOnTarget).toFixed(2)} contra
              </p>
              <p>
                <strong>Gols:</strong> {Number(analysis.awayProjectedGoals).toFixed(2)} a favor | {Number(analysis.awayProjectedGoals).toFixed(2)} contra
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Projeções */}
      <Card className="p-6 bg-card border border-border">
        <h2 className="text-2xl font-bold mb-6">Projeções</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Finalizações {analysis.homeTeamName}</p>
            <p className="text-2xl font-bold">{Number(analysis.homeProjectedShots).toFixed(2)}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Finalizações {analysis.awayTeamName}</p>
            <p className="text-2xl font-bold">{Number(analysis.awayProjectedShots).toFixed(2)}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Escanteios {analysis.homeTeamName}</p>
            <p className="text-2xl font-bold">{Number(analysis.homeProjectedCorners).toFixed(2)}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Escanteios {analysis.awayTeamName}</p>
            <p className="text-2xl font-bold">{Number(analysis.awayProjectedCorners).toFixed(2)}</p>
          </div>
        </div>
      </Card>

      {/* Conversões */}
      <Card className="p-6 bg-card border border-border">
        <h2 className="text-2xl font-bold mb-6">Conversões</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Conv. Ofensiva {analysis.homeTeamName}</p>
            <p className="text-2xl font-bold">{(Number(analysis.homeOffensiveConversion) * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Conv. Defensiva {analysis.homeTeamName}</p>
            <p className="text-2xl font-bold">{(Number(analysis.homeDefensiveConversion) * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Conv. Ofensiva {analysis.awayTeamName}</p>
            <p className="text-2xl font-bold">{(Number(analysis.awayOffensiveConversion) * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Conv. Defensiva {analysis.awayTeamName}</p>
            <p className="text-2xl font-bold">{(Number(analysis.awayDefensiveConversion) * 100).toFixed(1)}%</p>
          </div>
        </div>
      </Card>

      {/* Projeção Final */}
      <Card className="p-6 bg-primary text-primary-foreground border border-primary">
        <h2 className="text-2xl font-bold mb-4">Projeção Final</h2>
        <div className="text-center">
          <p className="text-6xl font-bold">
            {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
          </p>
          <p className="text-lg mt-2">
            {analysis.homeTeamName} x {analysis.awayTeamName}
          </p>
        </div>
      </Card>

      {/* Ranking de Linhas */}
      <Card className="p-6 bg-card border border-border">
        <h2 className="text-2xl font-bold mb-6">Ranking das Melhores Linhas Estatísticas</h2>
        <div className="overflow-x-auto">
          <table className="table-elegant w-full text-sm">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Linha</th>
                <th>Projeção</th>
                <th>Linha-base</th>
                <th>Margem Absoluta</th>
                <th>Margem %</th>
                <th>Estabilidade</th>
                <th>Correlação</th>
                <th>Índice</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rankingLines.slice(0, 10).map((line) => (
                <tr key={`${line.line}-${line.rank}`}>
                  <td>{line.rank}</td>
                  <td className="font-medium">{line.line}</td>
                  <td>{line.projection.toFixed(2)}</td>
                  <td>{line.baseline.toFixed(2)}</td>
                  <td>{line.absoluteMargin.toFixed(2)}</td>
                  <td>{line.percentageMargin.toFixed(1)}%</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded ${getStabilityBadge(line.stability)}`}>
                      {line.stability}
                    </span>
                  </td>
                  <td>{line.correlation}</td>
                  <td className="font-semibold">{line.confidenceIndex.toFixed(1)}</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(line.status)}`}>
                      {line.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Blocos de Ranking */}
      {cornerLines.length > 0 && (
        <Card className="p-6 bg-card border border-border">
          <h3 className="text-xl font-bold mb-4">Bloco A - Escanteios</h3>
          <div className="space-y-2">
            {cornerLines.map((line) => (
              <div key={line.line} className="flex justify-between items-center p-3 bg-muted rounded">
                <span>{line.line}</span>
                <span className="font-semibold">{line.projection.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {shotLines.length > 0 && (
        <Card className="p-6 bg-card border border-border">
          <h3 className="text-xl font-bold mb-4">Bloco B - Finalizações</h3>
          <div className="space-y-2">
            {shotLines.map((line) => (
              <div key={line.line} className="flex justify-between items-center p-3 bg-muted rounded">
                <span>{line.line}</span>
                <span className="font-semibold">{line.projection.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {shotOnTargetLines.length > 0 && (
        <Card className="p-6 bg-card border border-border">
          <h3 className="text-xl font-bold mb-4">Bloco C - Finalizações no Gol</h3>
          <div className="space-y-2">
            {shotOnTargetLines.map((line) => (
              <div key={line.line} className="flex justify-between items-center p-3 bg-muted rounded">
                <span>{line.line}</span>
                <span className="font-semibold">{line.projection.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {goalLines.length > 0 && (
        <Card className="p-6 bg-card border border-border">
          <h3 className="text-xl font-bold mb-4">Bloco D - Gols</h3>
          <div className="space-y-2">
            {goalLines.map((line) => (
              <div key={line.line} className="flex justify-between items-center p-3 bg-muted rounded">
                <span>{line.line}</span>
                <span className="font-semibold">{line.projection.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
