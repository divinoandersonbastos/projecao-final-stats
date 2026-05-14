import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Link as LinkIcon, AlertCircle, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ImportFromLink() {
  const [, navigate] = useLocation();
  const [homeTeamUrl, setHomeTeamUrl] = useState("");
  const [awayTeamUrl, setAwayTeamUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const importMutation = trpc.import.fromCraqueStats.useMutation();

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!homeTeamUrl.trim() || !awayTeamUrl.trim()) {
      toast.error("Preencha ambas as URLs dos times");
      return;
    }

    setIsLoading(true);

    try {
      const result = await importMutation.mutateAsync({
        homeTeamUrl: homeTeamUrl.trim(),
        awayTeamUrl: awayTeamUrl.trim(),
      });

      if (!result.success) {
        toast.error(result.error || "Erro ao importar dados");
        setIsLoading(false);
        return;
      }

      // Armazenar dados importados em sessionStorage para pré-preenchimento
      sessionStorage.setItem("importedData", JSON.stringify(result));
      toast.success("Dados importados com sucesso!");

      // Navegar para formulário com dados pré-preenchidos
      navigate("/dashboard/new");
    } catch (error) {
      toast.error("Erro ao importar dados. Verifique as URLs e tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => navigate("/dashboard/new")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Importar do CraqueStats</h1>
        <p className="text-muted-foreground">
          Extraia automaticamente dados estatísticos dos times através de URLs do CraqueStats
        </p>
      </div>

      {/* Instruções */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Como usar:
          </h3>
          <ol className="space-y-2 text-sm ml-7 list-decimal">
            <li>Acesse <a href="https://craquestats.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">craquestats.com.br</a> e faça login com sua conta Gmail</li>
            <li>Procure pelo time mandante e copie a URL da página (ex: craquestats.com.br/team/78094)</li>
            <li>Procure pelo time visitante e copie a URL da página</li>
            <li>Cole ambas as URLs abaixo e clique em "Importar"</li>
            <li>Os dados serão pré-preenchidos automaticamente no formulário</li>
          </ol>
        </div>
      </Card>

      {/* Formulário de Importação */}
      <Card className="p-6 bg-card border border-border">
        <form onSubmit={handleImport} className="space-y-6">
          {/* Time Mandante */}
          <div className="space-y-3">
            <Label htmlFor="homeTeamUrl" className="text-base font-semibold">
              URL do Time Mandante
            </Label>
            <Input
              id="homeTeamUrl"
              placeholder="https://craquestats.com.br/team/78094"
              value={homeTeamUrl}
              onChange={(e) => setHomeTeamUrl(e.target.value)}
              disabled={isLoading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Exemplo: Flamengo (https://craquestats.com.br/team/78094)
            </p>
          </div>

          {/* Time Visitante */}
          <div className="space-y-3">
            <Label htmlFor="awayTeamUrl" className="text-base font-semibold">
              URL do Time Visitante
            </Label>
            <Input
              id="awayTeamUrl"
              placeholder="https://craquestats.com.br/team/47708"
              value={awayTeamUrl}
              onChange={(e) => setAwayTeamUrl(e.target.value)}
              disabled={isLoading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Exemplo: Vitória (https://craquestats.com.br/team/47708)
            </p>
          </div>

          {/* Botão de Importação */}
          <Button
            type="submit"
            disabled={isLoading || !homeTeamUrl.trim() || !awayTeamUrl.trim()}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
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
        </form>
      </Card>

      {/* Informações sobre dados extraídos */}
      <Card className="p-6 bg-muted border border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Dados que serão extraídos:
        </h3>
        <ul className="space-y-2 text-sm ml-7 list-disc">
          <li>Nome do time</li>
          <li>Finalizações (a favor e contra)</li>
          <li>Escanteios</li>
          <li>Ataques perigosos</li>
          <li>Gols (a favor e contra)</li>
        </ul>
      </Card>

      {/* Aviso */}
      <Card className="p-6 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Nota importante:</p>
            <p className="text-amber-800 dark:text-amber-200">
              O CraqueStats usa JavaScript dinâmico para carregar dados. Se a importação automática não funcionar:
            </p>
            <ol className="list-decimal ml-5 text-amber-800 dark:text-amber-200 space-y-1 text-xs">
              <li>Acesse o link do time no CraqueStats</li>
              <li>Procure a tabela de estatísticas</li>
              <li>Copie os valores (Finalizações, Escanteios, Gols, etc)</li>
              <li>Volte e preencha os campos manualmente</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
