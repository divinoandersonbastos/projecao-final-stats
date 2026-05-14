import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { BarChart3, TrendingUp, Zap } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-8 mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Projeção Final Stats
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Análise estatística sofisticada de partidas de futebol. Transforme dados em decisões baseadas em inteligência.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/dashboard/new")}
              className="gap-2"
            >
              <Zap className="w-5 h-5" />
              Começar Nova Análise
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="p-8 bg-card border border-border hover:shadow-lg transition-shadow">
              <BarChart3 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Cálculos Automáticos</h3>
              <p className="text-muted-foreground text-sm">
                Motor de cálculo baseado em fórmulas estatísticas avançadas para projeções precisas.
              </p>
            </Card>

            <Card className="p-8 bg-card border border-border hover:shadow-lg transition-shadow">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ranking Inteligente</h3>
              <p className="text-muted-foreground text-sm">
                Classificação automática de linhas com índice de confiança e análise de correlação.
              </p>
            </Card>

            <Card className="p-8 bg-card border border-border hover:shadow-lg transition-shadow">
              <BarChart3 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Histórico Persistido</h3>
              <p className="text-muted-foreground text-sm">
                Salve e consulte suas análises anteriores com acesso rápido a todos os dados.
              </p>
            </Card>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/history")}
            >
              Ver Histórico de Análises
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl md:text-6xl font-bold text-foreground">
          Projeção Final Stats
        </h1>
        
        <p className="text-xl text-muted-foreground">
          Análise estatística sofisticada de partidas de futebol. Transforme dados em decisões baseadas em inteligência.
        </p>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            Calcule projeções automáticas, gere rankings de confiança e acesse um histórico completo de suas análises.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="gap-2">
              <Zap className="w-5 h-5" />
              Entrar para Começar
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="space-y-2">
            <BarChart3 className="w-8 h-8 text-primary mx-auto" />
            <h3 className="font-semibold">Cálculos Automáticos</h3>
            <p className="text-sm text-muted-foreground">
              Fórmulas estatísticas avançadas
            </p>
          </div>
          <div className="space-y-2">
            <TrendingUp className="w-8 h-8 text-primary mx-auto" />
            <h3 className="font-semibold">Ranking Inteligente</h3>
            <p className="text-sm text-muted-foreground">
              Índice de confiança automático
            </p>
          </div>
          <div className="space-y-2">
            <BarChart3 className="w-8 h-8 text-primary mx-auto" />
            <h3 className="font-semibold">Histórico Persistido</h3>
            <p className="text-sm text-muted-foreground">
              Acesso a todas as análises
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
