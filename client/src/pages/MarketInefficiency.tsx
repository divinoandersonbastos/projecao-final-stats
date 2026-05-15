import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Star, TrendingUp, Info, Trash2, Image, Loader2, X } from "lucide-react";
import { parseOddsInput, type OddsLine } from "@shared/market-inefficiency";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/png");
  const [isExtracting, setIsExtracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const bestLine = useMemo(() => analyzed.find(l => l.isBest), [analyzed]);

  const extractMutation = trpc.oddsOcr.extractFromImage.useMutation();

  function handleAnalyze() {
    const results = parseOddsInput(input);
    setAnalyzed(results);
    setHasAnalyzed(true);
  }

  function handleClear() {
    setInput("");
    setAnalyzed([]);
    setHasAnalyzed(false);
    setPastedImage(null);
  }

  function removePastedImage() {
    setPastedImage(null);
  }

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        setImageMimeType(item.type);

        // Convert to base64 for preview
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setPastedImage(dataUrl);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  async function handleExtractFromImage() {
    if (!pastedImage) return;

    setIsExtracting(true);
    try {
      // Strip the data:image/...;base64, prefix
      const base64 = pastedImage.split(",")[1];
      
      const result = await extractMutation.mutateAsync({
        imageBase64: base64,
        mimeType: imageMimeType,
      });

      if (result.success && result.data) {
        setInput(result.data);
        toast.success("Odds extraídas da imagem com sucesso!");
        // Auto-analyze
        const results = parseOddsInput(result.data);
        setAnalyzed(results);
        setHasAnalyzed(true);
      } else {
        toast.error(result.message || "Não foi possível extrair odds da imagem");
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message || "Falha ao processar imagem"}`);
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6" ref={containerRef} onPaste={handlePaste}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Detector de Ineficiência de Mercado</h1>
        <p className="text-gray-500 mt-1">
          Analise odds de mercados com três opções (mais de / exatamente / menos de) para identificar possíveis ineficiências matemáticas.
        </p>
      </div>

      {/* Image Paste Area */}
      {pastedImage ? (
        <Card className="border-blue-300 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-800">Imagem Colada</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={removePastedImage} className="text-gray-500 hover:text-red-600">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-blue-200 max-h-[300px] flex items-center justify-center bg-white">
              <img
                src={pastedImage}
                alt="Screenshot colado"
                className="max-h-[300px] object-contain"
              />
            </div>
            <Button
              onClick={handleExtractFromImage}
              disabled={isExtracting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extraindo odds da imagem...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Extrair Odds da Imagem
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50/50">
          <CardContent className="py-6 text-center">
            <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Cole uma imagem aqui (Ctrl+V)</p>
            <p className="text-xs text-gray-400 mt-1">
              Copie a área da tela com as odds e cole diretamente nesta página
            </p>
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inserir Linhas de Odds (Texto)</CardTitle>
          <p className="text-sm text-gray-500">
            Cole as linhas no formato: <code className="bg-gray-100 px-1 rounded">Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos</code>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Exemplo:\nEscanteios | 7 escanteios | 2.15 | 10.00 | 9.00\nGols | Acima 2.5 | 1.85 | 8.50 | 2.10\nChutes | Acima 9.5 | 1.90 | 12.00 | 1.95`}
            className="min-h-[120px] font-mono text-sm"
          />
          <div className="flex gap-3">
            <Button onClick={handleAnalyze} disabled={!input.trim()}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Analisar Odds
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={!input.trim() && !hasAnalyzed && !pastedImage}>
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
              <li><strong>Opção 1 - Imagem:</strong> Copie a área da tela com as odds (Print Screen / Snipping Tool) e cole aqui com <code className="bg-gray-200 px-1 rounded">Ctrl+V</code></li>
              <li><strong>Opção 2 - Texto:</strong> Cole as linhas de odds no campo de texto abaixo</li>
              <li>Use o separador <code className="bg-gray-200 px-1 rounded">|</code> ou <code className="bg-gray-200 px-1 rounded">;</code> ou <code className="bg-gray-200 px-1 rounded">tab</code></li>
              <li>Formato texto: <code className="bg-gray-200 px-1 rounded">Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos</code></li>
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
