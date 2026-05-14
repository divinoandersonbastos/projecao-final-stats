import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { RankingLine } from "@/types/analysis";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportAnalysisToPDF } from "@/lib/pdf-export";

export default function AnalysisDetail() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/analysis/:id");
  const [isExporting, setIsExporting] = useState(false);
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
      Forte: "bg-green-100 text-green-800",
      Boa: "bg-blue-100 text-blue-800",
      Média: "bg-yellow-100 text-yellow-800",
      Fraca: "bg-orange-100 text-orange-800",
      "Sem sustentação": "bg-red-100 text-red-800",
    };
    return badgeClasses[status] || "bg-gray-100 text-gray-800";
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

  const handleExportPDF = async () => {
    if (!analysis) {
      toast.error("Análise não carregada");
      return;
    }

    setIsExporting(true);
    try {
      await exportAnalysisToPDF(analysis);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (!analysis) {
    return (
      <div className="space-y-8">
        <Button variant="outline" onClick={() => navigate("/history")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Card className="p-12 bg-card border border-border text-center">
          <p className="text-muted-foreground">Análise não encontrada</p>
        </Card>
      </div>
    );
  }

  const homeData = analysis.homeTeamDataJson as any;
  const awayData = analysis.awayTeamDataJson as any;
  const alternativeProjs = (analysis.alternativeProjections as any) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate("/history")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exportar PDF
            </>
          )}
        </Button>
      </div>

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
                <strong>Ataques perigosos:</strong> {homeData?.dangerousAttacksFor || 0} a favor | {homeData?.dangerousAttacksAgainst || 0} contra
              </p>
              <p>
                <strong>Escanteios:</strong> {homeData?.cornersFor || 0} a favor | {homeData?.cornersAgainst || 0} contra
              </p>
              <p>
                <strong>Finalizações:</strong> {homeData?.shotsFor || 0} a favor | {homeData?.shotsAgainst || 0} contra
              </p>
              <p>
                <strong>Finalizações no gol:</strong> {homeData?.shotsOnTargetFor || 0} a favor | {homeData?.shotsOnTargetAgainst || 0} contra
              </p>
              <p>
                <strong>Gols:</strong> {homeData?.goalsFor || 0} a favor | {homeData?.goalsAgainst || 0} contra
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{analysis.awayTeamName}</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Ataques perigosos:</strong> {awayData?.dangerousAttacksFor || 0} a favor | {awayData?.dangerousAttacksAgainst || 0} contra
              </p>
              <p>
                <strong>Escanteios:</strong> {awayData?.cornersFor || 0} a favor | {awayData?.cornersAgainst || 0} contra
              </p>
              <p>
                <strong>Finalizações:</strong> {awayData?.shotsFor || 0} a favor | {awayData?.shotsAgainst || 0} contra
              </p>
              <p>
                <strong>Finalizações no gol:</strong> {awayData?.shotsOnTargetFor || 0} a favor | {awayData?.shotsOnTargetAgainst || 0} contra
              </p>
              <p>
                <strong>Gols:</strong> {awayData?.goalsFor || 0} a favor | {awayData?.goalsAgainst || 0} contra
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

      {/* Resultado do Modelo */}
      <Card className="p-6 bg-card border border-border">
        <h2 className="text-2xl font-bold mb-6">Resultado do Modelo</h2>
        <div className="space-y-4">
          <div className="text-center p-6 bg-primary text-primary-foreground rounded-lg">
            <p className="text-sm opacity-90 mb-2">Projeção Principal</p>
            <p className="text-5xl font-bold">
              {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3">Placares Alternativos</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {alternativeProjs.map((proj: any, idx: number) => (
                <div key={idx} className="p-3 bg-muted rounded-lg text-center">
                  <p className="font-semibold">{proj.home} x {proj.away}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Projeção Final */}
      <Card className="p-6 bg-primary text-primary-foreground border border-primary">
        <h2 className="text-2xl font-bold mb-4">Projeção Final FTHG x FTAG</h2>
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
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-semibold">Rank</th>
                <th className="text-left p-3 font-semibold">Linha</th>
                <th className="text-left p-3 font-semibold">Projeção</th>
                <th className="text-left p-3 font-semibold">Linha-base</th>
                <th className="text-left p-3 font-semibold">Margem absoluta</th>
                <th className="text-left p-3 font-semibold">Margem %</th>
                <th className="text-left p-3 font-semibold">Estabilidade</th>
                <th className="text-left p-3 font-semibold">Correlação</th>
                <th className="text-left p-3 font-semibold">Índice de confiança</th>
                <th className="text-left p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rankingLines.slice(0, 10).map((line) => (
                <tr key={`${line.line}-${line.rank}`} className="border-b border-border hover:bg-muted">
                  <td className="p-3">{line.rank}</td>
                  <td className="p-3 font-medium">{line.line}</td>
                  <td className="p-3">{line.projection.toFixed(2)}</td>
                  <td className="p-3">{line.baseline.toFixed(2)}</td>
                  <td className="p-3">{line.absoluteMargin.toFixed(2)}</td>
                  <td className="p-3">{line.percentageMargin.toFixed(1)}%</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded ${getStabilityBadge(line.stability)}`}>
                      {line.stability}
                    </span>
                  </td>
                  <td className="p-3">{line.correlation}</td>
                  <td className="p-3 font-semibold">{line.confidenceIndex.toFixed(1)}</td>
                  <td className="p-3">
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
          <h3 className="text-xl font-bold mb-4">Escanteios (A)</h3>
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
          <h3 className="text-xl font-bold mb-4">Finalizações (B)</h3>
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
          <h3 className="text-xl font-bold mb-4">Finalizações no Gol (C)</h3>
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
          <h3 className="text-xl font-bold mb-4">Gols (D)</h3>
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
