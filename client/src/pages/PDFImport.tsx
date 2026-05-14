import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileUp, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ExtractedTeamData {
  teamName: string;
  attacks: number;
  attacksAgainst: number;
  corners: number;
  cornersAgainst: number;
  shots: number;
  shotsAgainst: number;
  shotsOnTarget: number;
  shotsOnTargetAgainst: number;
  goals: number;
  goalsAgainst: number;
}

export default function PDFImport() {
  const [, navigate] = useLocation();
  const [homeFile, setHomeFile] = useState<File | null>(null);
  const [awayFile, setAwayFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [homeResult, setHomeResult] = useState<ExtractedTeamData | null>(null);
  const [awayResult, setAwayResult] = useState<ExtractedTeamData | null>(null);

  const importBothMutation = trpc.pdfImport.importBothTeams.useMutation();

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    teamType: "home" | "away"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Por favor, selecione um arquivo PDF");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("O arquivo PDF deve ter no máximo 20MB");
        return;
      }
      if (teamType === "home") {
        setHomeFile(file);
        setHomeResult(null);
      } else {
        setAwayFile(file);
        setAwayResult(null);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:application/pdf;base64, prefix
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImport = async () => {
    if (!homeFile || !awayFile) {
      toast.error("Por favor, selecione os PDFs de ambos os times");
      return;
    }

    setLoading(true);
    setProgress("Convertendo PDFs...");
    setHomeResult(null);
    setAwayResult(null);

    try {
      // Convert both files to base64
      setProgress("Preparando PDFs para envio...");
      const [homeBase64, awayBase64] = await Promise.all([
        fileToBase64(homeFile),
        fileToBase64(awayFile),
      ]);

      setProgress("Enviando PDFs para análise via IA... (pode levar até 30 segundos)");

      // Send both PDFs to backend for OCR extraction
      const result = await importBothMutation.mutateAsync({
        homePdfBase64: homeBase64,
        awayPdfBase64: awayBase64,
        homeFileName: homeFile.name,
        awayFileName: awayFile.name,
      });

      if (result.success && result.data) {
        setHomeResult(result.data.home);
        setAwayResult(result.data.away);
        setProgress("");

        // Store data in sessionStorage for NewAnalysis page
        sessionStorage.setItem(
          "importedTeamData",
          JSON.stringify({
            home: result.data.home,
            away: result.data.away,
          })
        );

        toast.success(result.message || "Dados extraídos com sucesso!");
      } else {
        setProgress("");
        toast.error(result.message || "Falha ao extrair dados dos PDFs");
      }
    } catch (error) {
      setProgress("");
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao importar PDFs: " + errorMsg);
      console.error("PDF import error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToAnalysis = () => {
    navigate("/new");
  };

  const StatPreview = ({ label, value }: { label: string; value: number }) => (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value.toFixed(1)}</span>
    </div>
  );

  const TeamResultCard = ({
    title,
    data,
    isHome,
  }: {
    title: string;
    data: ExtractedTeamData;
    isHome: boolean;
  }) => (
    <Card className={`p-4 border-2 ${isHome ? "border-blue-200 bg-blue-50/50" : "border-orange-200 bg-orange-50/50"}`}>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className={`w-5 h-5 ${isHome ? "text-blue-600" : "text-orange-600"}`} />
        <h4 className="font-semibold text-slate-800">{data.teamName}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isHome ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
          {title}
        </span>
      </div>
      <div className="space-y-0.5">
        <StatPreview label="Ataques Perigosos (A Favor)" value={data.attacks} />
        <StatPreview label="Ataques Perigosos (Contra)" value={data.attacksAgainst} />
        <StatPreview label="Escanteios (A Favor)" value={data.corners} />
        <StatPreview label="Escanteios (Contra)" value={data.cornersAgainst} />
        <StatPreview label="Finalizações (A Favor)" value={data.shots} />
        <StatPreview label="Finalizações (Contra)" value={data.shotsAgainst} />
        <StatPreview label="Finalizações no Gol (A Favor)" value={data.shotsOnTarget} />
        <StatPreview label="Finalizações no Gol (Contra)" value={data.shotsOnTargetAgainst} />
        <StatPreview label="Gols (A Favor)" value={data.goals} />
        <StatPreview label="Gols (Contra)" value={data.goalsAgainst} />
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/new")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Nova Análise
        </button>
        <h1 className="text-2xl font-bold text-foreground">Importar PDFs do CraqueStats</h1>
        <p className="text-muted-foreground mt-1">
          Faça upload dos PDFs com as estatísticas dos times para extração automática via IA
        </p>
      </div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Home Team */}
        <Card className="p-5 border-2 border-dashed border-slate-300 hover:border-blue-400 transition">
          <span className="text-sm font-semibold text-slate-700 mb-3 block">
            PDF do Time Mandante
          </span>
          <div className="relative">
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, "home")}
              className="hidden"
              id="home-pdf"
              disabled={loading}
            />
            <label
              htmlFor="home-pdf"
              className={`flex flex-col items-center justify-center p-6 cursor-pointer rounded-lg transition ${
                homeFile ? "bg-blue-50 border border-blue-200" : "bg-slate-50 hover:bg-blue-50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FileUp className={`w-7 h-7 mb-2 ${homeFile ? "text-blue-500" : "text-slate-400"}`} />
              <span className="text-sm text-slate-600 text-center">
                {homeFile ? homeFile.name : "Clique para selecionar PDF"}
              </span>
              {homeFile && (
                <span className="text-xs text-blue-600 mt-1">
                  {(homeFile.size / 1024).toFixed(0)} KB
                </span>
              )}
            </label>
          </div>
        </Card>

        {/* Away Team */}
        <Card className="p-5 border-2 border-dashed border-slate-300 hover:border-orange-400 transition">
          <span className="text-sm font-semibold text-slate-700 mb-3 block">
            PDF do Time Visitante
          </span>
          <div className="relative">
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, "away")}
              className="hidden"
              id="away-pdf"
              disabled={loading}
            />
            <label
              htmlFor="away-pdf"
              className={`flex flex-col items-center justify-center p-6 cursor-pointer rounded-lg transition ${
                awayFile ? "bg-orange-50 border border-orange-200" : "bg-slate-50 hover:bg-orange-50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FileUp className={`w-7 h-7 mb-2 ${awayFile ? "text-orange-500" : "text-slate-400"}`} />
              <span className="text-sm text-slate-600 text-center">
                {awayFile ? awayFile.name : "Clique para selecionar PDF"}
              </span>
              {awayFile && (
                <span className="text-xs text-orange-600 mt-1">
                  {(awayFile.size / 1024).toFixed(0)} KB
                </span>
              )}
            </label>
          </div>
        </Card>
      </div>

      {/* Progress */}
      {loading && progress && (
        <Card className="p-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">{progress}</p>
              <p className="text-xs text-blue-700 mt-0.5">
                A IA está analisando as imagens dos PDFs para extrair os dados estatísticos
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Results Preview */}
      {(homeResult || awayResult) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Dados Extraídos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {homeResult && (
              <TeamResultCard title="Mandante" data={homeResult} isHome={true} />
            )}
            {awayResult && (
              <TeamResultCard title="Visitante" data={awayResult} isHome={false} />
            )}
          </div>
          <Button
            onClick={handleNavigateToAnalysis}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-5 text-base font-semibold rounded-lg transition"
          >
            Usar Dados Extraídos na Análise
          </Button>
        </div>
      )}

      {/* Instructions */}
      <Card className="p-5 bg-amber-50 border border-amber-200">
        <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Como obter os PDFs:
        </h3>
        <ol className="space-y-1.5 text-sm text-amber-800">
          <li>1. Acesse <a href="https://craquestats.com.br" target="_blank" rel="noopener noreferrer" className="underline font-semibold">craquestats.com.br</a></li>
          <li>2. Faça login e acesse a página de estatísticas do time</li>
          <li>3. Configure os filtros (Casa/Visitante, Jogo completo, etc.)</li>
          <li>4. Use "Imprimir como PDF" (Ctrl+P) ou faça screenshot e salve como PDF</li>
          <li>5. Selecione os PDFs acima e clique em "Extrair Dados"</li>
        </ol>
      </Card>

      {/* Action Button */}
      {!homeResult && !awayResult && (
        <Button
          onClick={handleImport}
          disabled={!homeFile || !awayFile || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-semibold rounded-lg transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Extraindo dados via IA...
            </>
          ) : (
            <>
              <FileUp className="w-5 h-5 mr-2" />
              Extrair Dados dos PDFs
            </>
          )}
        </Button>
      )}
    </div>
  );
}
