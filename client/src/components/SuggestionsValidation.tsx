import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Shield, Scale, Flame, CheckCircle2, XCircle, MinusCircle, Info, Equal } from "lucide-react";

interface SuggestionsValidationProps {
  analysisId: number;
  finalStats: any; // The final match stats with actual values
  analysis: any; // The analysis object with homeTeamName/awayTeamName
}

/**
 * Validates the suggestion combinations against actual match results.
 * For each line in a combination:
 * - actual >= baseline → Validada (green)
 * - actual == baseline (exactly) → Push (yellow)
 * - actual < baseline → Não Validada (red)
 */
export default function SuggestionsValidation({ analysisId, finalStats, analysis }: SuggestionsValidationProps) {
  const { data, isLoading } = trpc.analysis.getSuggestions.useQuery(
    { id: analysisId },
    { enabled: !!analysisId }
  );

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border border-border">
        <div className="flex items-center justify-center h-16">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Validando sugestões...</span>
        </div>
      </Card>
    );
  }

  if (!data || data.combinations.length === 0 || !finalStats) {
    return null;
  }

  const homeTeamName = (analysis?.homeTeamName || "").toLowerCase();
  const awayTeamName = (analysis?.awayTeamName || "").toLowerCase();

  // Map actual stats from finalStats to line names
  const getActualValue = (lineName: string): number | null => {
    const lower = lineName.toLowerCase();

    if (lower.includes("total chutes no gol") || lower.includes("total finalizações no gol")) {
      const home = finalStats.homeShotsOnTarget;
      const away = finalStats.awayShotsOnTarget;
      if (home == null || away == null) return null;
      return home + away;
    }
    if (lower.includes("chutes no gol") || lower.includes("finalizações no gol")) {
      if (homeTeamName && lower.includes(homeTeamName)) {
        return finalStats.homeShotsOnTarget ?? null;
      }
      if (awayTeamName && lower.includes(awayTeamName)) {
        return finalStats.awayShotsOnTarget ?? null;
      }
      return null;
    }

    if (lower === "total finalizações") {
      const home = finalStats.homeShots;
      const away = finalStats.awayShots;
      if (home == null || away == null) return null;
      return home + away;
    }
    if (lower.includes("finalizações")) {
      if (homeTeamName && lower.includes(homeTeamName)) {
        return finalStats.homeShots ?? null;
      }
      if (awayTeamName && lower.includes(awayTeamName)) {
        return finalStats.awayShots ?? null;
      }
      return null;
    }

    if (lower.includes("total escanteios")) {
      const home = finalStats.homeCorners;
      const away = finalStats.awayCorners;
      if (home == null || away == null) return null;
      return home + away;
    }
    if (lower.includes("escanteios")) {
      if (homeTeamName && lower.includes(homeTeamName)) {
        return finalStats.homeCorners ?? null;
      }
      if (awayTeamName && lower.includes(awayTeamName)) {
        return finalStats.awayCorners ?? null;
      }
      return null;
    }

    if (lower.includes("total gols")) {
      const home = finalStats.homeGoals;
      const away = finalStats.awayGoals;
      if (home == null || away == null) return null;
      return home + away;
    }
    if (lower.includes("gols esperados") || lower.includes("gols")) {
      if (homeTeamName && lower.includes(homeTeamName)) {
        return finalStats.homeGoals ?? null;
      }
      if (awayTeamName && lower.includes(awayTeamName)) {
        return finalStats.awayGoals ?? null;
      }
      return null;
    }

    return null;
  };

  type LineStatus = "validada" | "push" | "não validada" | "indisponível";

  const profileIcons = {
    conservador: Shield,
    equilibrado: Scale,
    agressivo: Flame,
  };

  const profileColors = {
    conservador: "border-blue-200 dark:border-blue-800",
    equilibrado: "border-green-200 dark:border-green-800",
    agressivo: "border-orange-200 dark:border-orange-800",
  };

  return (
    <Card className="p-6 bg-card border border-border">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        Validação das Sugestões Estatísticas
      </h3>

      <div className="space-y-4">
        {data.combinations.map((combo) => {
          const Icon = profileIcons[combo.profile];
          const borderColor = profileColors[combo.profile];

          // Validate each line against baseline
          const lineResults = combo.lines.map((line) => {
            const actual = getActualValue(line.line);
            if (actual === null) {
              return { line: line.line, baseline: line.baseline, projection: line.projection, actual: null, status: "indisponível" as LineStatus };
            }
            // Classification:
            // actual > baseline → Validada
            // actual == baseline → Push (empate exato na linha)
            // actual < baseline → Não Validada
            let status: LineStatus;
            if (actual > line.baseline) {
              status = "validada";
            } else if (actual === line.baseline) {
              status = "push";
            } else {
              status = "não validada";
            }
            return {
              line: line.line,
              baseline: line.baseline,
              projection: line.projection,
              actual,
              status,
            };
          });

          const validatedCount = lineResults.filter(r => r.status === "validada").length;
          const pushCount = lineResults.filter(r => r.status === "push").length;
          const totalLines = lineResults.length;
          const availableLines = lineResults.filter(r => r.status !== "indisponível").length;

          let comboStatus: string;
          let comboStatusColor: string;
          if (availableLines === 0) {
            comboStatus = "Dados indisponíveis";
            comboStatusColor = "text-gray-500";
          } else if (validatedCount === totalLines) {
            comboStatus = "Validada";
            comboStatusColor = "text-green-600";
          } else if (validatedCount + pushCount === totalLines && pushCount > 0) {
            comboStatus = "Push";
            comboStatusColor = "text-amber-600";
          } else if (validatedCount > 0) {
            comboStatus = "Parcialmente validada";
            comboStatusColor = "text-amber-600";
          } else {
            comboStatus = "Não validada";
            comboStatusColor = "text-red-600";
          }

          return (
            <div key={combo.profile} className={`border rounded-lg p-4 ${borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{combo.profileLabel}</span>
                </div>
                <span className={`text-sm font-medium ${comboStatusColor}`}>{comboStatus}</span>
              </div>

              <div className="space-y-2">
                {lineResults.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      {result.status === "validada" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      {result.status === "push" && <Equal className="w-4 h-4 text-amber-500" />}
                      {result.status === "não validada" && <XCircle className="w-4 h-4 text-red-500" />}
                      {result.status === "indisponível" && <MinusCircle className="w-4 h-4 text-gray-400" />}
                      <span>{result.line} acima de {result.baseline.toFixed(1)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.actual !== null ? (
                        <span>Real: <strong className="text-foreground">{result.actual}</strong></span>
                      ) : (
                        <span className="italic">N/D</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                {availableLines > 0
                  ? `${validatedCount} validada${validatedCount !== 1 ? "s" : ""}${pushCount > 0 ? `, ${pushCount} push` : ""} de ${totalLines} linhas`
                  : "Dados reais não disponíveis para esta combinação"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>Classificação: Real &gt; linha = Validada | Real = linha = Push | Real &lt; linha = Não validada</span>
      </div>
    </Card>
  );
}
