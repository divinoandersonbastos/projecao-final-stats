import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Star, TrendingUp, Info, Trash2 } from "lucide-react";
import { parseOddsInput, type OddsLine } from "@shared/market-inefficiency";

// Re-export for backward compatibility
export { calculateImpliedSum, calculateTheoreticalMargin, classifyStatus, findBestLine, parseOddsInput } from "@shared/market-inefficiency";

type StatusConfig = {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
};

// ============================================================
// STATUS CONFIG
// ============================================================

const STATUS_MAP: Record<string, StatusConfig> = {
  high: {
    label: "Ineficiência alta",
    color: "bg-green-600",
    bgClass: "bg-green-50 border-green-300",
    textClass: "text-green-800",
  },
  medium: {
    label: "Ineficiência média",
    color: "bg-green-400",
    bgClass: "bg-green-50/60 border-green-200",
    textClass: "text-green-700",
  },
  low: {
    label: "Ineficiência baixa",
    color: "bg-yellow-400",
    bgClass: "bg-yellow-50 border-yellow-200",
    textClass: "text-yellow-800",
  },
  none: {
    label: "Sem ineficiência",
    color: "bg-gray-400",
    bgClass: "bg-gray-50 border-gray-200",
    textClass: "text-gray-600",
  },
};

// ============================================================
// COMPONENT
// ============================================================

export default function MarketInefficiency() {
  const [input, setInput] = useState("");
  const [analyzed, setAnalyzed] = useState<OddsLine[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const bestLine = useMemo(() => analyzed.find(l => l.isBest), [analyzed]);

  function handleAnalyze() {
    const results = parseOddsInput(input);
    setAnalyzed(results);
    setHasAnalyzed(true);
  }

  function handleClear() {
    setInput("");
    setAnalyzed([]);
    setHasAnalyzed(false);
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Detector de Ineficiência de Mercado</h1>
        <p className="text-gray-500 mt-1">
          Analise odds de mercados com três opções (mais de / exatamente / menos de) para identificar possíveis ineficiências matemáticas.
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inserir Linhas de Odds</CardTitle>
          <p className="text-sm text-gray-500">
            Cole as linhas no formato: <code className="bg-gray-100 px-1 rounded">Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos</code>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Exemplo:\nEscanteios | 7 escanteios | 2.15 | 10.00 | 9.00\nGols | Acima 2.5 | 1.85 | 8.50 | 2.10\nChutes | Acima 9.5 | 1.90 | 12.00 | 1.95`}
            className="min-h-[160px] font-mono text-sm"
          />
          <div className="flex gap-3">
            <Button onClick={handleAnalyze} disabled={!input.trim()}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Analisar Odds
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={!input.trim() && !hasAnalyzed}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasAnalyzed && (
        <>
          {analyzed.length === 0 ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 font-medium">Nenhuma linha válida encontrada.</p>
                <p className="text-red-600 text-sm mt-1">
                  Verifique o formato: Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Best Line Card */}
              {bestLine ? (
                <Card className="border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-green-600 fill-green-600" />
                      <CardTitle className="text-lg text-green-800">Melhor Possibilidade Detectada</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-green-700 font-medium">Mercado</p>
                        <p className="text-lg font-bold text-green-900">{bestLine.market}</p>
                        <p className="text-sm text-green-600">Linha: {bestLine.line}</p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700 font-medium">Odds Analisadas</p>
                        <div className="space-y-0.5 mt-1">
                          <p className="text-sm"><span className="text-green-600">Mais de:</span> <strong>{bestLine.oddOver.toFixed(2)}</strong></p>
                          <p className="text-sm"><span className="text-green-600">Exatamente:</span> <strong>{bestLine.oddExact.toFixed(2)}</strong></p>
                          <p className="text-sm"><span className="text-green-600">Menos de:</span> <strong>{bestLine.oddUnder.toFixed(2)}</strong></p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-green-700 font-medium">Análise</p>
                        <p className="text-sm mt-1">Soma implícita: <strong>{bestLine.impliedSum.toFixed(4)}</strong></p>
                        <p className="text-lg font-bold text-green-800 mt-1">
                          Margem: {bestLine.theoreticalMargin.toFixed(1)}%
                        </p>
                        <Badge className="mt-1 bg-green-600 text-white">
                          {STATUS_MAP[bestLine.status].label}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-yellow-800">
                        Confirmar se as três opções pertencem ao mesmo mercado, mesma linha e cobrem todos os cenários possíveis.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-300 bg-gray-50">
                  <CardContent className="py-6 text-center">
                    <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-700 font-medium">Nenhuma ineficiência matemática positiva encontrada.</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Todas as linhas analisadas possuem margem teórica ≤ 0%.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resultados da Análise</CardTitle>
                  <p className="text-sm text-gray-500">
                    {analyzed.length} linha{analyzed.length > 1 ? "s" : ""} analisada{analyzed.length > 1 ? "s" : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-3 font-medium text-gray-600">Mercado</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-600">Linha</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-600">Mais de</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-600">Exatamente</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-600">Menos de</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-600">Soma Impl.</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-600">Margem</th>
                          <th className="text-center py-3 px-3 font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyzed.map((line, idx) => {
                          const statusCfg = STATUS_MAP[line.status];
                          const rowClass = line.isBest
                            ? "bg-green-100 border-2 border-green-400"
                            : line.status === "high"
                            ? "bg-green-50/60"
                            : line.status === "medium"
                            ? "bg-green-50/30"
                            : line.status === "low"
                            ? "bg-yellow-50/50"
                            : line.theoreticalMargin <= 0
                            ? "bg-red-50/30"
                            : "";

                          return (
                            <tr key={idx} className={`border-b border-gray-100 ${rowClass}`}>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  {line.isBest && <Star className="w-4 h-4 text-green-600 fill-green-600 shrink-0" />}
                                  <span className={line.isBest ? "font-bold text-green-800" : ""}>{line.market}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={line.isBest ? "font-bold text-green-800" : ""}>{line.line}</span>
                                {line.isBest && (
                                  <Badge className="ml-2 bg-green-600 text-white text-[10px] px-1.5 py-0">
                                    Melhor possibilidade
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center font-mono">{line.oddOver.toFixed(2)}</td>
                              <td className="py-3 px-3 text-center font-mono">{line.oddExact.toFixed(2)}</td>
                              <td className="py-3 px-3 text-center font-mono">{line.oddUnder.toFixed(2)}</td>
                              <td className="py-3 px-3 text-center font-mono">{line.impliedSum.toFixed(4)}</td>
                              <td className={`py-3 px-3 text-center font-mono ${line.isBest ? "font-bold text-green-800" : ""}`}>
                                {line.theoreticalMargin.toFixed(1)}%
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant="outline" className={`${statusCfg.bgClass} ${statusCfg.textClass} text-xs`}>
                                  {statusCfg.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Legend */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-green-600"></div>
                      <span>Melhor possibilidade matemática</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-green-300"></div>
                      <span>Outras possíveis ineficiências</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-yellow-300"></div>
                      <span>Margem baixa (0-5%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-gray-300"></div>
                      <span>Mercado equilibrado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-red-300"></div>
                      <span>Sem ineficiência / dados inválidos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Security Disclaimer */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              Esta ferramenta apenas identifica possíveis ineficiências matemáticas nas odds. Confirme as regras do mercado antes de qualquer decisão.
            </p>
          </div>
        </>
      )}

      {/* Instructions */}
      {!hasAnalyzed && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-6">
            <h3 className="font-medium text-gray-700 mb-3">Como usar</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Cole as linhas de odds no campo acima, uma por linha</li>
              <li>Use o separador <code className="bg-gray-200 px-1 rounded">|</code> ou <code className="bg-gray-200 px-1 rounded">;</code> ou <code className="bg-gray-200 px-1 rounded">tab</code></li>
              <li>Formato: <code className="bg-gray-200 px-1 rounded">Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos</code></li>
              <li>Clique em "Analisar Odds" para ver os resultados</li>
            </ol>
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded font-mono text-xs text-gray-600">
              <p className="text-gray-400 mb-1"># Exemplo:</p>
              <p>Escanteios | 7 escanteios | 2.15 | 10.00 | 9.00</p>
              <p>Gols | Acima 2.5 | 1.85 | 8.50 | 2.10</p>
              <p>Chutes | Acima 9.5 | 1.90 | 12.00 | 1.95</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
