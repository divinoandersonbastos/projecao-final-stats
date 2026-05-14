import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileUp, ArrowLeft } from "lucide-react";

export default function PDFImport() {
  const [, navigate] = useLocation();
  const [homeFile, setHomeFile] = useState<File | null>(null);
  const [awayFile, setAwayFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (teamType === "home") {
        setHomeFile(file);
      } else {
        setAwayFile(file);
      }
    }
  };

  const handleImport = async () => {
    if (!homeFile || !awayFile) {
      toast.error("Por favor, selecione os PDFs de ambos os times");
      return;
    }

    setLoading(true);
    try {
      // Note: In a real implementation, you would upload files to the server
      // and extract data using the pdfImport.importBothTeams procedure
      // For now, we'll show a placeholder implementation

      toast.success("Funcionalidade de importação em desenvolvimento");
      // After successful import, navigate to new analysis with pre-filled data
      // navigate("/dashboard/new");
    } catch (error) {
      toast.error("Erro ao importar PDFs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard/new")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Importar PDFs do CraqueStats</h1>
          <p className="text-slate-600 mt-2">
            Faça upload dos PDFs com as estatísticas dos times para pré-preenchimento automático
          </p>
        </div>

        {/* Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Home Team */}
          <Card className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-400 transition">
            <Label className="block mb-4">
              <span className="text-sm font-semibold text-slate-700 mb-2 block">
                Time Mandante
              </span>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, "home")}
                  className="hidden"
                  id="home-pdf"
                />
                <label
                  htmlFor="home-pdf"
                  className="flex flex-col items-center justify-center p-8 cursor-pointer rounded-lg bg-slate-50 hover:bg-blue-50 transition"
                >
                  <FileUp className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-600">
                    {homeFile ? homeFile.name : "Clique para selecionar PDF"}
                  </span>
                </label>
              </div>
            </Label>
            {homeFile && (
              <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
                ✓ {homeFile.name}
              </div>
            )}
          </Card>

          {/* Away Team */}
          <Card className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-400 transition">
            <Label className="block mb-4">
              <span className="text-sm font-semibold text-slate-700 mb-2 block">
                Time Visitante
              </span>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, "away")}
                  className="hidden"
                  id="away-pdf"
                />
                <label
                  htmlFor="away-pdf"
                  className="flex flex-col items-center justify-center p-8 cursor-pointer rounded-lg bg-slate-50 hover:bg-blue-50 transition"
                >
                  <FileUp className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-600">
                    {awayFile ? awayFile.name : "Clique para selecionar PDF"}
                  </span>
                </label>
              </div>
            </Label>
            {awayFile && (
              <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
                ✓ {awayFile.name}
              </div>
            )}
          </Card>
        </div>

        {/* Instructions */}
        <Card className="p-6 bg-blue-50 border border-blue-200 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">Como usar:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Acesse <a href="https://craquestats.com.br" target="_blank" rel="noopener noreferrer" className="underline font-semibold">craquestats.com.br</a></li>
            <li>2. Faça login com sua conta Gmail</li>
            <li>3. Acesse a página de estatísticas de cada time</li>
            <li>4. Faça screenshot ou exporte como PDF</li>
            <li>5. Selecione os PDFs acima e clique em "Importar"</li>
          </ol>
        </Card>

        {/* Action Button */}
        <Button
          onClick={handleImport}
          disabled={!homeFile || !awayFile || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-lg transition"
        >
          {loading ? "Importando..." : "Importar Dados dos PDFs"}
        </Button>

        {/* Info */}
        <p className="text-center text-sm text-slate-600 mt-6">
          Os dados serão extraídos automaticamente e pré-preenchidos no formulário de análise
        </p>
      </div>
    </div>
  );
}
