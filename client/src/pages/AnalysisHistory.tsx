import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Loader2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AnalysisHistory() {
  const [, navigate] = useLocation();
  const { data: analyses, isLoading } = trpc.analysis.list.useQuery();
  const deleteAnalysisMutation = trpc.analysis.delete.useMutation({
    onSuccess: () => {
      toast.success("Análise deletada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao deletar análise: " + error.message);
    },
  });

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
          <Button onClick={() => navigate("/dashboard/new")}>
            Criar Nova Análise
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Histórico de Análises</h1>
        <p className="text-muted-foreground">
          {analyses.length} análise{analyses.length !== 1 ? "s" : ""} realizada{analyses.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-4">
        {analyses.map((analysis) => (
          <Card key={analysis.id} className="p-6 bg-card border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {analysis.homeTeamName} x {analysis.awayTeamName}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(analysis.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-foreground">
                    <strong>Projeção:</strong> {analysis.projectedHomeGoals} x {analysis.projectedAwayGoals}
                  </span>
                  <span className="text-muted-foreground">
                    Modo: {analysis.analysisMode === "mode1" ? "Geral" : "Mandante x Visitante"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/analysis/${analysis.id}`)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver
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
                  Deletar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={() => navigate("/dashboard/new")} className="w-full">
        Criar Nova Análise
      </Button>
    </div>
  );
}
