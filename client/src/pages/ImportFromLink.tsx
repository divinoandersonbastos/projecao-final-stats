import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Link as LinkIcon, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ImportFromLink() {
  const [, navigate] = useLocation();
  
  // Aba 1: Importação por URL
  const [homeTeamUrl, setHomeTeamUrl] = useState("");
  const [awayTeamUrl, setAwayTeamUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Aba 2: Entrada manual
  const [homeTeamName, setHomeTeamName] = useState("");
  const [homeFinalizacoes, setHomeFinalizacoes] = useState("");
  const [homeFinalizacoesContra, setHomeFinalizacoesContra] = useState("");
  const [homeEscanteios, setHomeEscanteios] = useState("");
  const [homeAtaquesPerigosos, setHomeAtaquesPerigosos] = useState("");
  const [homeGols, setHomeGols] = useState("");
  const [homeGolsContra, setHomeGolsContra] = useState("");

  const [awayTeamName, setAwayTeamName] = useState("");
  const [awayFinalizacoes, setAwayFinalizacoes] = useState("");
  const [awayFinalizacoesContra, setAwayFinalizacoesContra] = useState("");
  const [awayEscanteios, setAwayEscanteios] = useState("");
  const [awayAtaquesPerigosos, setAwayAtaquesPerigosos] = useState("");
  const [awayGols, setAwayGols] = useState("");
  const [awayGolsContra, setAwayGolsContra] = useState("");

  const importMutation = trpc.import.fromCraqueStats.useMutation();

  const handleImportFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!homeTeamUrl.trim() || !awayTeamUrl.trim()) {
      toast.error("Preencha ambas as URLs dos times");
      return;
    }

    setIsLoadingUrl(true);

    try {
      const result = await importMutation.mutateAsync({
        homeTeamUrl: homeTeamUrl.trim(),
        awayTeamUrl: awayTeamUrl.trim(),
      });

      if (!result.success) {
        toast.error(result.error || "Erro ao importar dados. Tente preencher manualmente.");
        setIsLoadingUrl(false);
        return;
      }

      sessionStorage.setItem("importedData", JSON.stringify(result));
      toast.success("Dados importados com sucesso!");
      navigate("/new");
    } catch (error) {
      toast.error("Erro ao importar dados. Use a aba 'Entrada Manual' para preencher os dados.");
      setIsLoadingUrl(false);
    }
  };

  const handleImportManual = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos
    if (!homeTeamName.trim() || !awayTeamName.trim()) {
      toast.error("Preencha os nomes dos times");
      return;
    }

    const homeData = {
      name: homeTeamName.trim(),
      finalizacoes: parseFloat(homeFinalizacoes) || 0,
      finalizacoesContra: parseFloat(homeFinalizacoesContra) || 0,
      escanteios: parseFloat(homeEscanteios) || 0,
      ataquesPerigosos: parseFloat(homeAtaquesPerigosos) || 0,
      gols: parseFloat(homeGols) || 0,
      golsContra: parseFloat(homeGolsContra) || 0,
    };

    const awayData = {
      name: awayTeamName.trim(),
      finalizacoes: parseFloat(awayFinalizacoes) || 0,
      finalizacoesContra: parseFloat(awayFinalizacoesContra) || 0,
      escanteios: parseFloat(awayEscanteios) || 0,
      ataquesPerigosos: parseFloat(awayAtaquesPerigosos) || 0,
      gols: parseFloat(awayGols) || 0,
      golsContra: parseFloat(awayGolsContra) || 0,
    };

    const importedData = {
      success: true,
      homeTeam: homeData,
      awayTeam: awayData,
    };

    sessionStorage.setItem("importedData", JSON.stringify(importedData));
    toast.success("Dados preenchidos com sucesso!");
    navigate("/new");
  };

  const copyTemplateToClipboard = () => {
    const template = `Mandante: [Nome do time]
Finalizações: [valor]
Finalizações contra: [valor]
Escanteios: [valor]
Ataques perigosos: [valor]
Gols: [valor]
Gols contra: [valor]

Visitante: [Nome do time]
Finalizações: [valor]
Finalizações contra: [valor]
Escanteios: [valor]
Ataques perigosos: [valor]
Gols: [valor]
Gols contra: [valor]`;

    navigator.clipboard.writeText(template);
    toast.success("Template copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/new")}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Importar Dados de Times</h1>
          <p className="text-muted-foreground mt-1">
            Escolha entre importação automática ou preenchimento manual
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Entrada Manual</TabsTrigger>
          <TabsTrigger value="url">Por URL do CraqueStats</TabsTrigger>
        </TabsList>

        {/* Aba: Entrada Manual */}
        <TabsContent value="manual" className="space-y-6">
          <Card className="p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Como preencher os dados:
                </p>
                <ol className="list-decimal ml-5 text-blue-800 dark:text-blue-200 space-y-1">
                  <li>Acesse o CraqueStats e procure pelo time</li>
                  <li>Na tabela de estatísticas, identifique os valores</li>
                  <li>Preencha os campos abaixo com os valores encontrados</li>
                  <li>Clique em "Confirmar Dados"</li>
                </ol>
              </div>
            </div>
          </Card>

          <form onSubmit={handleImportManual} className="space-y-6">
            {/* Time Mandante */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Time Mandante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homeTeamName">Nome do Time</Label>
                  <Input
                    id="homeTeamName"
                    placeholder="Ex: Flamengo"
                    value={homeTeamName}
                    onChange={(e) => setHomeTeamName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="homeFinalizacoes">Finalizações</Label>
                  <Input
                    id="homeFinalizacoes"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 15.6"
                    value={homeFinalizacoes}
                    onChange={(e) => setHomeFinalizacoes(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="homeFinalizacoesContra">Finalizações Contra</Label>
                  <Input
                    id="homeFinalizacoesContra"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 11.1"
                    value={homeFinalizacoesContra}
                    onChange={(e) => setHomeFinalizacoesContra(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="homeEscanteios">Escanteios</Label>
                  <Input
                    id="homeEscanteios"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 8"
                    value={homeEscanteios}
                    onChange={(e) => setHomeEscanteios(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="homeAtaquesPerigosos">Ataques Perigosos</Label>
                  <Input
                    id="homeAtaquesPerigosos"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 12"
                    value={homeAtaquesPerigosos}
                    onChange={(e) => setHomeAtaquesPerigosos(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="homeGols">Gols</Label>
                  <Input
                    id="homeGols"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 2"
                    value={homeGols}
                    onChange={(e) => setHomeGols(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="homeGolsContra">Gols Contra</Label>
                  <Input
                    id="homeGolsContra"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 1"
                    value={homeGolsContra}
                    onChange={(e) => setHomeGolsContra(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </Card>

            {/* Time Visitante */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Time Visitante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="awayTeamName">Nome do Time</Label>
                  <Input
                    id="awayTeamName"
                    placeholder="Ex: Vitória"
                    value={awayTeamName}
                    onChange={(e) => setAwayTeamName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="awayFinalizacoes">Finalizações</Label>
                  <Input
                    id="awayFinalizacoes"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 6.8"
                    value={awayFinalizacoes}
                    onChange={(e) => setAwayFinalizacoes(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="awayFinalizacoesContra">Finalizações Contra</Label>
                  <Input
                    id="awayFinalizacoesContra"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 15.6"
                    value={awayFinalizacoesContra}
                    onChange={(e) => setAwayFinalizacoesContra(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="awayEscanteios">Escanteios</Label>
                  <Input
                    id="awayEscanteios"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 6.8"
                    value={awayEscanteios}
                    onChange={(e) => setAwayEscanteios(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="awayAtaquesPerigosos">Ataques Perigosos</Label>
                  <Input
                    id="awayAtaquesPerigosos"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 10"
                    value={awayAtaquesPerigosos}
                    onChange={(e) => setAwayAtaquesPerigosos(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="awayGols">Gols</Label>
                  <Input
                    id="awayGols"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 1"
                    value={awayGols}
                    onChange={(e) => setAwayGols(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="awayGolsContra">Gols Contra</Label>
                  <Input
                    id="awayGolsContra"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 2"
                    value={awayGolsContra}
                    onChange={(e) => setAwayGolsContra(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </Card>

            <Button type="submit" size="lg" className="w-full">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Dados e Continuar
            </Button>
          </form>
        </TabsContent>

        {/* Aba: Importação por URL */}
        <TabsContent value="url" className="space-y-6">
          <Card className="p-6 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-2">
                <p className="font-semibold text-amber-900 dark:text-amber-100">Nota importante:</p>
                <p className="text-amber-800 dark:text-amber-200">
                  O CraqueStats usa JavaScript dinâmico para carregar dados. Se a importação automática não funcionar, use a aba "Entrada Manual" para preencher os dados.
                </p>
              </div>
            </div>
          </Card>

          <form onSubmit={handleImportFromUrl} className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="homeTeamUrl" className="text-base font-semibold">
                    URL do Time Mandante
                  </Label>
                  <Input
                    id="homeTeamUrl"
                    placeholder="https://craquestats.com.br/team/78094"
                    value={homeTeamUrl}
                    onChange={(e) => setHomeTeamUrl(e.target.value)}
                    disabled={isLoadingUrl}
                    className="font-mono text-sm mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Exemplo: Flamengo (https://craquestats.com.br/team/78094)
                  </p>
                </div>

                <div>
                  <Label htmlFor="awayTeamUrl" className="text-base font-semibold">
                    URL do Time Visitante
                  </Label>
                  <Input
                    id="awayTeamUrl"
                    placeholder="https://craquestats.com.br/team/47708"
                    value={awayTeamUrl}
                    onChange={(e) => setAwayTeamUrl(e.target.value)}
                    disabled={isLoadingUrl}
                    className="font-mono text-sm mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Exemplo: Vitória (https://craquestats.com.br/team/47708)
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoadingUrl || !homeTeamUrl.trim() || !awayTeamUrl.trim()}
                  size="lg"
                  className="w-full"
                >
                  {isLoadingUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Importar Dados
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
