import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { extractCraqueStatsData, validateCraqueStatsData } from "../scrapers/craquestats";

export const importRouter = router({
  /**
   * Importa dados de um time do CraqueStats através de URL
   */
  fromCraqueStats: publicProcedure
    .input(
      z.object({
        homeTeamUrl: z.string().url("URL inválida para time mandante"),
        awayTeamUrl: z.string().url("URL inválida para time visitante"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Extrair dados de ambos os times
        const [homeData, awayData] = await Promise.all([
          extractCraqueStatsData(input.homeTeamUrl),
          extractCraqueStatsData(input.awayTeamUrl),
        ]);

        // Validar dados extraídos
        if (!homeData) {
          throw new Error("Falha ao extrair dados do time mandante. Verifique a URL.");
        }

        if (!awayData) {
          throw new Error("Falha ao extrair dados do time visitante. Verifique a URL.");
        }

        if (!validateCraqueStatsData(homeData)) {
          throw new Error("Dados do time mandante inválidos ou incompletos.");
        }

        if (!validateCraqueStatsData(awayData)) {
          throw new Error("Dados do time visitante inválidos ou incompletos.");
        }

        // Retornar dados formatados para o formulário
        return {
          success: true,
          homeTeam: {
            name: homeData.teamName,
            ataquesPerigosos: homeData.ataquesPerigosos,
            escanteios: homeData.escanteios,
            finalizacoes: homeData.finalizacoes,
            finalizacoesNoGol: 0, // Será calculado se disponível
            gols: homeData.gols,
            golsContra: homeData.golsContra,
            finalizacoesContra: homeData.finalizacoesContra,
          },
          awayTeam: {
            name: awayData.teamName,
            ataquesPerigosos: awayData.ataquesPerigosos,
            escanteios: awayData.escanteios,
            finalizacoes: awayData.finalizacoes,
            finalizacoesNoGol: 0, // Será calculado se disponível
            gols: awayData.gols,
            golsContra: awayData.golsContra,
            finalizacoesContra: awayData.finalizacoesContra,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido ao importar dados";
        return {
          success: false,
          error: message,
        };
      }
    }),
});
