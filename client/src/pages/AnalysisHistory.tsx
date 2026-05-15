import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation, useSearch } from "wouter";
import { Loader2, Trash2, Eye, ClipboardCheck, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FilterStatus = "all" | "pending" | "finished" | "validated";

const filterLabels: Record<FilterStatus, string> = {
  all: "Todas",
  pending: "Pendentes",
  finished: "Finalizadas",
  validated: "Validadas",
};

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  finished: { label: "Finalizada", icon: AlertCircle, color: "text-blue-600 bg-blue-50 border-blue-200" },
  validated: { label: "Validada", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
};

export default function AnalysisHistory() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialFilter = searchParams.get("filter") === "validation" ? "pending" : "all";
  const [filter, setFilter] = useState<FilterStatus>(initialFilter);

  const utils = trpc.useUtils();
  const { data: analyses, isLoading } = trpc.analysis.list.useQuery();
  const deleteAnalysisMutation = trpc.analysis.delete.useMutation({
    onSuccess: () => {
      toast.success("Análise deletada com sucesso");
      utils.analysis.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar análise: " + error.message);
    },
  });

  const filteredAnalyses = useMemo(() => {
    if (!analyses) return [];
    if (filter === "all") return analyses;
    return analyses.filter((a) => a.validationStatus === filter);
  }, [analyses, filter]);

  const statusCounts = useMemo(() => {
    if (!analyses) return { all: 0, pending: 0, finished: 0, validated: 0 };
    return {
      all: analyses.length,
      pending: analyses.filter((a) => a.validationStatus === "pending").length,
      finished: analyses.filter((a) => a.validationStatus === "finished").length,
      validated: analyses.filter((a) => a.validationStatus === "validated").length,
    };
  }, [analyses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analyses || analyses.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Histórico de Análises</h1>
          <p className="text-muted-foreground">
            Nenhuma análise realizada ainda.
          </p>
        </div>

        <Card className="p-12 bg-card border border-border text-center">
          <p className="text-muted-foreground mb-4">
            Comece criando uma nova análise para ver o histórico aqui.
          </p>
          <Button onClick={() => navigate("/new")}>
            Criar Nova Análise
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Histórico de Análises</h1>
        <p className="text-muted-foreground">
          {analyses.length} análise{analyses.length !== 1 ? "s" : ""} realizada{analyses.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(filterLabels) as FilterStatus[]).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
            className="gap-2"
          >
            {filterLabels[status]}
            <span className="text-xs opacity-75">({statusCounts[status]})</span>
          </Button>
        ))}
      </div>

      {/* Analysis List */}
      <div className="space-y-4">
        {filteredAnalyses.length === 0 ? (
          <Card className="p-8 bg-card border border-border text-center">
            <p className="text-muted-foreground">
              Nenhuma análise com o filtro "{filterLabels[filter]}".
            </p>
          </Card>
        ) : (
          filteredAnalyses.map((analysis) => {
            const status = analysis.validationStatus || "pending";
            const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <Card key={analysis.id} className="p-6 bg-card border border-border hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {analysis.homeTeamName} x {analysis.awayTeamName}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(analysis.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <div className="flex gap-4 mt-3 text-sm flex-wrap">
                      <span className="text-foreground">
                        <strong>Projeção:</strong> {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
                      </span>
                      {analysis.finalHomeGoals != null && analysis.finalAwayGoals != null && (
                        <span className="text-blue-600 font-semibold">
                          <strong>Real:</strong> {analysis.finalHomeGoals} x {analysis.finalAwayGoals}
                        </span>
                      )}
                      {analysis.overallScore != null && analysis.overallClassification && (
                        <span className={`inline-flex items-center gap-1 font-semibold ${
                          analysis.overallClassification === "excellent" ? "text-green-600" :
                          analysis.overallClassification === "good" ? "text-blue-600" :
                          analysis.overallClassification === "medium" ? "text-amber-600" :
                          "text-red-600"
                        }`}>
                          {analysis.overallClassification === "excellent" ? "✓ Alcançada" :
                           analysis.overallClassification === "good" ? "≈ Próxima" :
                           analysis.overallClassification === "medium" ? "~ Parcial" :
                           "✗ Não Alcançada"}
                          <span className="text-xs opacity-75">({parseFloat(String(analysis.overallScore)).toFixed(0)}%)</span>
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Modo: {analysis.analysisMode === "mode1" ? "Geral" : "Mandante x Visitante"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/analysis/${analysis.id}`)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant={status === "validated" ? "outline" : "default"}
                      onClick={() => navigate(`/validation/${analysis.id}`)}
                      className="gap-2"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      {status === "validated" ? "Ver Validação" : "Validar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja deletar esta análise?")) {
                          deleteAnalysisMutation.mutate({ id: analysis.id });
                        }
                      }}
                      disabled={deleteAnalysisMutation.isPending}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Button onClick={() => navigate("/new")} className="w-full">
        Criar Nova Análise
      </Button>
    </div>
  );
}
