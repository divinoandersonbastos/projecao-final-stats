import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface TeamFormData {
  name: string;
  dangerousAttacksFor: number;
  dangerousAttacksAgainst: number;
  cornersFor: number;
  cornersAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  shotsOnTargetFor: number;
  shotsOnTargetAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
}

const initialTeamData: TeamFormData = {
  name: "",
  dangerousAttacksFor: 0,
  dangerousAttacksAgainst: 0,
  cornersFor: 0,
  cornersAgainst: 0,
  shotsFor: 0,
  shotsAgainst: 0,
  shotsOnTargetFor: 0,
  shotsOnTargetAgainst: 0,
  goalsFor: 0,
  goalsAgainst: 0,
};

export default function NewAnalysis() {
  const [, navigate] = useLocation();
  const [homeTeam, setHomeTeam] = useState<TeamFormData>(initialTeamData);
  const [awayTeam, setAwayTeam] = useState<TeamFormData>(initialTeamData);
  const [analysisMode, setAnalysisMode] = useState<"mode1" | "mode2">("mode2");

  const createAnalysisMutation = trpc.analysis.create.useMutation({
    onSuccess: (data) => {
      toast.success("Análise criada com sucesso!");
      navigate("/dashboard/analysis/" + data.rankingLines[0]?.rank);
    },
    onError: (error) => {
      toast.error("Erro ao criar análise: " + error.message);
    },
  });

  const handleTeamChange = (
    team: "home" | "away",
    field: keyof TeamFormData,
    value: string | number
  ) => {
    const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
    if (team === "home") {
      setHomeTeam((prev) => ({ ...prev, [field]: numValue }));
    } else {
      setAwayTeam((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!homeTeam.name.trim()) {
      toast.error("Nome do time mandante é obrigatório");
      return;
    }

    if (!awayTeam.name.trim()) {
      toast.error("Nome do time visitante é obrigatório");
      return;
    }

    createAnalysisMutation.mutate({
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      analysisMode,
      homeTeam: {
        dangerousAttacksFor: homeTeam.dangerousAttacksFor,
        dangerousAttacksAgainst: homeTeam.dangerousAttacksAgainst,
        cornersFor: homeTeam.cornersFor,
        cornersAgainst: homeTeam.cornersAgainst,
        shotsFor: homeTeam.shotsFor,
        shotsAgainst: homeTeam.shotsAgainst,
        shotsOnTargetFor: homeTeam.shotsOnTargetFor,
        shotsOnTargetAgainst: homeTeam.shotsOnTargetAgainst,
        goalsFor: homeTeam.goalsFor,
        goalsAgainst: homeTeam.goalsAgainst,
      },
      awayTeam: {
        dangerousAttacksFor: awayTeam.dangerousAttacksFor,
        dangerousAttacksAgainst: awayTeam.dangerousAttacksAgainst,
        cornersFor: awayTeam.cornersFor,
        cornersAgainst: awayTeam.cornersAgainst,
        shotsFor: awayTeam.shotsFor,
        shotsAgainst: awayTeam.shotsAgainst,
        shotsOnTargetFor: awayTeam.shotsOnTargetFor,
        shotsOnTargetAgainst: awayTeam.shotsOnTargetAgainst,
        goalsFor: awayTeam.goalsFor,
        goalsAgainst: awayTeam.goalsAgainst,
      },
    });
  };

  const StatField = ({
    label,
    team,
    field,
    value,
  }: {
    label: string;
    team: "home" | "away";
    field: keyof TeamFormData;
    value: number;
  }) => (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => handleTeamChange(team, field, e.target.value)}
        className="bg-input border border-border rounded-md px-3 py-2"
      />
    </div>
  );

  const TeamSection = ({
    team,
    data,
    isHome,
  }: {
    team: "home" | "away";
    data: TeamFormData;
    isHome: boolean;
  }) => (
    <Card className="p-6 bg-card border border-border">
      <h3 className="text-lg font-semibold mb-4">
        {isHome ? "Time Mandante" : "Time Visitante"}
      </h3>

      <div className="mb-6">
        <Label className="text-sm font-medium">Nome do Time</Label>
        <Input
          type="text"
          placeholder={isHome ? "Ex: Flamengo" : "Ex: Vasco"}
          value={data.name}
          onChange={(e) => handleTeamChange(team, "name", e.target.value)}
          className="mt-2 bg-input border border-border rounded-md px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatField
          label="Ataques Perigosos (A Favor)"
          team={team}
          field="dangerousAttacksFor"
          value={data.dangerousAttacksFor}
        />
        <StatField
          label="Ataques Perigosos (Contra)"
          team={team}
          field="dangerousAttacksAgainst"
          value={data.dangerousAttacksAgainst}
        />
        <StatField
          label="Escanteios (A Favor)"
          team={team}
          field="cornersFor"
          value={data.cornersFor}
        />
        <StatField
          label="Escanteios (Contra)"
          team={team}
          field="cornersAgainst"
          value={data.cornersAgainst}
        />
        <StatField
          label="Finalizações (A Favor)"
          team={team}
          field="shotsFor"
          value={data.shotsFor}
        />
        <StatField
          label="Finalizações (Contra)"
          team={team}
          field="shotsAgainst"
          value={data.shotsAgainst}
        />
        <StatField
          label="Finalizações no Gol (A Favor)"
          team={team}
          field="shotsOnTargetFor"
          value={data.shotsOnTargetFor}
        />
        <StatField
          label="Finalizações no Gol (Contra)"
          team={team}
          field="shotsOnTargetAgainst"
          value={data.shotsOnTargetAgainst}
        />
        <StatField
          label="Gols (A Favor)"
          team={team}
          field="goalsFor"
          value={data.goalsFor}
        />
        <StatField
          label="Gols (Contra)"
          team={team}
          field="goalsAgainst"
          value={data.goalsAgainst}
        />
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Nova Análise</h1>
        <p className="text-muted-foreground">
          Insira os dados estatísticos dos dois times para gerar uma projeção completa da partida.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Modo de Análise</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="mode1"
                checked={analysisMode === "mode1"}
                onChange={(e) => setAnalysisMode(e.target.value as "mode1" | "mode2")}
                className="w-4 h-4"
              />
              <span className="text-sm">Modo 1 - Geral</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="mode2"
                checked={analysisMode === "mode2"}
                onChange={(e) => setAnalysisMode(e.target.value as "mode1" | "mode2")}
                className="w-4 h-4"
              />
              <span className="text-sm">Modo 2 - Mandante x Visitante (Recomendado)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TeamSection team="home" data={homeTeam} isHome={true} />
          <TeamSection team="away" data={awayTeam} isHome={false} />
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/history")}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createAnalysisMutation.isPending}
            className="gap-2"
          >
            {createAnalysisMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Gerar Análise
          </Button>
        </div>
      </form>
    </div>
  );
}
