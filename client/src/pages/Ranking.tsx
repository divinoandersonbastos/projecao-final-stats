import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { RankingLine } from "@/types/analysis";

export default function Ranking() {
  const [, navigate] = useLocation();
  const [categoryFilter, setCategoryFilter] = useState<"all" | "A" | "B" | "C" | "D">("all");
  const [sortBy, setSortBy] = useState<"confidence" | "margin" | "stability">("confidence");

  const { data: analyses, isLoading } = trpc.analysis.list.useQuery();

  const allRankingLines = useMemo(() => {
    if (!analyses) return [];
    const lines: RankingLine[] = [];
    analyses.forEach((analysis) => {
      if (analysis.rankingData) {
        const data = analysis.rankingData as unknown as RankingLine[];
        lines.push(...data);
      }
    });
    return lines;
  }, [analyses]);

  const filteredLines = useMemo(() => {
    let filtered = allRankingLines;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((line) => line.category === categoryFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "confidence":
          return b.confidenceIndex - a.confidenceIndex;
        case "margin":
          return b.absoluteMargin - a.absoluteMargin;
        case "stability":
          return a.stability === "Alta" ? -1 : a.stability === "Média" ? 1 : 1;
        default:
          return 0;
      }
    });

    return sorted;
  }, [allRankingLines, categoryFilter, sortBy]);

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      A: "Escanteios (A)",
      B: "Finalizações (B)",
      C: "Finalizações no Gol (C)",
      D: "Gols (D)",
    };
    return labels[category] || category;
  };

  const getAlertIcon = (line: RankingLine) => {
    const alerts = [];

    // Alerta para conversões acima de 40%
    if (line.percentageMargin > 40) {
      alerts.push("⚠️");
    }

    // Alerta para volatilidade (baixa estabilidade)
    if (line.stability === "Baixa") {
      alerts.push("🔴");
    }

    return alerts.length > 0 ? alerts.join(" ") : "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => navigate("/history")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Ranking das Melhores Linhas</h1>
        <p className="text-muted-foreground">
          Análise consolidada de todas as linhas estatísticas com índice de confiança
        </p>
      </div>

      {/* Filtros */}
      <Card className="p-6 bg-card border border-border">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Filtrar por Categoria</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                onClick={() => setCategoryFilter("all")}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={categoryFilter === "A" ? "default" : "outline"}
                onClick={() => setCategoryFilter("A")}
                size="sm"
              >
                Escanteios (A)
              </Button>
              <Button
                variant={categoryFilter === "B" ? "default" : "outline"}
                onClick={() => setCategoryFilter("B")}
                size="sm"
              >
                Finalizações (B)
              </Button>
              <Button
                variant={categoryFilter === "C" ? "default" : "outline"}
                onClick={() => setCategoryFilter("C")}
                size="sm"
              >
                Finalizações no Gol (C)
              </Button>
              <Button
                variant={categoryFilter === "D" ? "default" : "outline"}
                onClick={() => setCategoryFilter("D")}
                size="sm"
              >
                Gols (D)
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Ordenar por</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === "confidence" ? "default" : "outline"}
                onClick={() => setSortBy("confidence")}
                size="sm"
              >
                Índice de Confiança
              </Button>
              <Button
                variant={sortBy === "margin" ? "default" : "outline"}
                onClick={() => setSortBy("margin")}
                size="sm"
              >
                Margem Absoluta
              </Button>
              <Button
                variant={sortBy === "stability" ? "default" : "outline"}
                onClick={() => setSortBy("stability")}
                size="sm"
              >
                Estabilidade
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabela de Ranking */}
      <Card className="p-6 bg-card border border-border">
        <h2 className="text-2xl font-bold mb-6">Ranking Consolidado</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-semibold">Alerta</th>
                <th className="text-left p-3 font-semibold">Rank</th>
                <th className="text-left p-3 font-semibold">Categoria</th>
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
              {filteredLines.slice(0, 50).map((line, idx) => (
                <tr key={`${line.line}-${idx}`} className="border-b border-border hover:bg-muted">
                  <td className="p-3 text-lg">{getAlertIcon(line)}</td>
                  <td className="p-3">{line.rank}</td>
                  <td className="p-3 font-medium">{getCategoryLabel(line.category)}</td>
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

        {filteredLines.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma linha encontrada com os filtros selecionados
          </div>
        )}
      </Card>

      {/* Legenda de Alertas */}
      <Card className="p-6 bg-muted border border-border">
        <h3 className="text-lg font-semibold mb-4">Legenda de Alertas</h3>
        <div className="space-y-3 text-sm">
          <p>
            <strong>⚠️ Margem Alta:</strong> Linhas com margem percentual acima de 40% indicam volatilidade
            potencial e requerem análise cuidadosa
          </p>
          <p>
            <strong>🔴 Baixa Estabilidade:</strong> Linhas com estabilidade baixa podem sofrer variações
            significativas em diferentes cenários
          </p>
          <p>
            <strong>Índice de Confiança:</strong> Varia de 0 a 100, considerando margem, estabilidade e
            correlação
          </p>
          <p>
            <strong>Status:</strong> Classificação qualitativa baseada no índice de confiança e estabilidade
          </p>
        </div>
      </Card>
    </div>
  );
}
