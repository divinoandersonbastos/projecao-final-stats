import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Shield, Scale, Flame, AlertTriangle, XCircle, CheckCircle2, Info } from "lucide-react";

interface SuggestionsSectionProps {
  analysisId: number;
}

export default function SuggestionsSection({ analysisId }: SuggestionsSectionProps) {
  const { data, isLoading, error } = trpc.analysis.getSuggestions.useQuery(
    { id: analysisId },
    { enabled: !!analysisId }
  );

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border border-border">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Gerando sugestões...</span>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  if (data.combinations.length === 0 && data.rejectedLines.length === 0) {
    return null;
  }

  const profileConfig = {
    conservador: {
      icon: Shield,
      gradient: "from-blue-500/10 to-blue-600/5",
      border: "border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600",
      headerBg: "bg-blue-50 dark:bg-blue-950/30",
      tagBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    },
    equilibrado: {
      icon: Scale,
      gradient: "from-green-500/10 to-teal-600/5",
      border: "border-green-200 dark:border-green-800",
      iconColor: "text-green-600",
      headerBg: "bg-green-50 dark:bg-green-950/30",
      tagBg: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
    },
    agressivo: {
      icon: Flame,
      gradient: "from-orange-500/10 to-amber-600/5",
      border: "border-orange-200 dark:border-orange-800",
      iconColor: "text-orange-600",
      headerBg: "bg-orange-50 dark:bg-orange-950/30",
      tagBg: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    },
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Forte":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
      case "Boa":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
      case "Média":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCorrelationBadge = (level: string) => {
    switch (level) {
      case "Alta":
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
      case "Média":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Sugestões Estatísticas do Modelo</h2>
        <p className="text-sm text-muted-foreground">
          Combinações geradas automaticamente com base no ranking, margem, estabilidade e correlação.
        </p>
      </div>

      {/* Profile Cards */}
      {data.combinations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {data.combinations.map((combo) => {
            const config = profileConfig[combo.profile];
            const Icon = config.icon;

            return (
              <Card
                key={combo.profile}
                className={`overflow-hidden border ${config.border} transition-all hover:shadow-md`}
              >
                {/* Card Header */}
                <div className={`p-4 ${config.headerBg}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                    <div>
                      <h3 className="font-bold text-sm">{combo.profileLabel}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.tagBg}`}>
                        {combo.profileTag}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-4">
                  {/* Lines */}
                  <div className="space-y-2">
                    {combo.lines.map((line, idx) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{line.line}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusBadge(line.status)}`}>
                            {line.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Projeção: <strong className="text-foreground">{line.projection.toFixed(2)}</strong></span>
                          <span>Linha-base: <strong className="text-foreground">{line.baseline.toFixed(2)}</strong></span>
                          <span>Margem: <strong className="text-foreground">+{line.absoluteMargin.toFixed(2)}</strong></span>
                          <span>Margem %: <strong className="text-foreground">+{line.percentageMargin.toFixed(1)}%</strong></span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Índice: <strong className="text-foreground">{line.confidenceIndex.toFixed(1)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Combination Stats */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Índice médio:</span>
                      <span className="font-semibold">{combo.averageIndex.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Correlação:</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getCorrelationBadge(combo.correlationLevel)}`}>
                        {combo.correlationLevel}
                      </span>
                    </div>
                    {combo.correlationPenalty > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Penalidade:</span>
                        <span className="text-red-600 font-medium">-{combo.correlationPenalty.toFixed(1)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Índice final:</span>
                      <span className="font-bold text-lg">{combo.finalIndex.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusBadge(combo.finalStatus)}`}>
                        {combo.finalStatus}
                      </span>
                    </div>
                  </div>

                  {/* Alerts */}
                  {combo.alerts.length > 0 && (
                    <div className="border-t pt-3 space-y-1.5">
                      {combo.alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* No suggestions available */}
      {data.combinations.length === 0 && (
        <Card className="p-6 bg-muted/50 border border-border">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Info className="w-5 h-5" />
            <p className="text-sm">
              Nenhuma combinação atende aos critérios mínimos para sugestão nesta análise.
            </p>
          </div>
        </Card>
      )}

      {/* Rejected Lines */}
      {data.rejectedLines.length > 0 && (
        <Card className="p-6 bg-card border border-border">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Linhas Rejeitadas pelo Modelo
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Linha</th>
                  <th className="text-center p-2 font-semibold">Projeção</th>
                  <th className="text-center p-2 font-semibold">Linha-base</th>
                  <th className="text-center p-2 font-semibold">Margem</th>
                  <th className="text-left p-2 font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {data.rejectedLines.map((line, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-2 font-medium">{line.line}</td>
                    <td className="text-center p-2">{line.projection.toFixed(2)}</td>
                    <td className="text-center p-2">{line.baseline.toFixed(2)}</td>
                    <td className="text-center p-2">
                      <span className={line.absoluteMargin < 0 ? "text-red-600" : "text-green-600"}>
                        {line.absoluteMargin >= 0 ? "+" : ""}{line.absoluteMargin.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-2 text-muted-foreground text-xs">{line.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg border border-border">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground italic">
          {data.disclaimer}
        </p>
      </div>
    </div>
  );
}
