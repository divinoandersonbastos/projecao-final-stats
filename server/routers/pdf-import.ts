import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";

/**
 * Extract team statistics from a CraqueStats PDF screenshot using LLM vision.
 * The PDFs are screenshots of the CraqueStats website with dark background
 * showing a table of team statistics (Estatísticas do time).
 * 
 * The table has rows for different statistics and columns for game-by-game data.
 * The leftmost visible column shows the average/total values.
 * Row labels may be cut off but can be identified by typical value ranges.
 */
async function extractStatsFromPDFBase64(base64Data: string): Promise<{
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
}> {
  const imageUrl = `data:application/pdf;base64,${base64Data}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Você é um especialista em extrair estatísticas de futebol de screenshots do site CraqueStats.

A imagem mostra uma página do CraqueStats com "Estatísticas do time" de um time de futebol brasileiro.
O layout é:
- Fundo escuro (tema dark)
- Nome do time no topo (ex: "Flamengo", "Vitória")
- Uma tabela com várias linhas de estatísticas
- Cada linha tem: percentual (coluna 1), média (coluna 2, em verde), média ajustada (coluna 3, em verde), e depois valores jogo a jogo
- As linhas da tabela representam diferentes estatísticas do time

As linhas típicas do CraqueStats (de cima para baixo) são:
1. Ataques Perigosos (valores altos, ex: 43-55, média por jogo)
2. Escanteios (valores baixos, ex: 1.5-2.5)
3. Finalizações Totais (valores médios, ex: 4-7)
4. Finalizações no Gol (valores médios, ex: 6-16)
5. Gols (valores baixos, ex: 0.5-6)
6. Posse de Bola (valores percentuais, ex: 1-3)
7. Cartões Amarelos (valores baixos)
8. Total de Passes (valores muito altos, ex: 294-440)
9. Impedimentos (valores baixos)
10. Faltas (valores baixos)
11. Pênaltis

Para cada estatística, os valores "A Favor" e "Contra" podem estar na mesma linha ou em linhas separadas.

IMPORTANTE: 
- Extraia a MÉDIA (segunda coluna, em verde) de cada estatística, NÃO os valores individuais dos jogos
- O nome do time aparece no topo da página
- Se não conseguir identificar uma estatística, use 0

Retorne APENAS um JSON válido com a estrutura especificada.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analise esta imagem do CraqueStats e extraia as estatísticas do time.

Preciso dos seguintes dados (use a MÉDIA, que é o segundo valor em verde na segunda coluna de cada linha):
- Nome do time (aparece no topo)
- Ataques Perigosos: média a favor e contra
- Escanteios: média a favor e contra
- Finalizações: média a favor e contra
- Finalizações no Gol: média a favor e contra
- Gols: média a favor e contra

Retorne um JSON com esta estrutura exata:
{
  "teamName": "Nome do Time",
  "attacks": <média de ataques perigosos a favor>,
  "attacksAgainst": <média de ataques perigosos contra>,
  "corners": <média de escanteios a favor>,
  "cornersAgainst": <média de escanteios contra>,
  "shots": <média de finalizações a favor>,
  "shotsAgainst": <média de finalizações contra>,
  "shotsOnTarget": <média de finalizações no gol a favor>,
  "shotsOnTargetAgainst": <média de finalizações no gol contra>,
  "goals": <média de gols a favor>,
  "goalsAgainst": <média de gols contra>
}`,
          },
          {
            type: "file_url",
            file_url: {
              url: imageUrl,
              mime_type: "application/pdf",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "craquestats_data",
        strict: true,
        schema: {
          type: "object",
          properties: {
            teamName: { type: "string", description: "Nome do time" },
            attacks: { type: "number", description: "Média de ataques perigosos a favor" },
            attacksAgainst: { type: "number", description: "Média de ataques perigosos contra" },
            corners: { type: "number", description: "Média de escanteios a favor" },
            cornersAgainst: { type: "number", description: "Média de escanteios contra" },
            shots: { type: "number", description: "Média de finalizações a favor" },
            shotsAgainst: { type: "number", description: "Média de finalizações contra" },
            shotsOnTarget: { type: "number", description: "Média de finalizações no gol a favor" },
            shotsOnTargetAgainst: { type: "number", description: "Média de finalizações no gol contra" },
            goals: { type: "number", description: "Média de gols a favor" },
            goalsAgainst: { type: "number", description: "Média de gols contra" },
          },
          required: [
            "teamName", "attacks", "attacksAgainst",
            "corners", "cornersAgainst",
            "shots", "shotsAgainst",
            "shotsOnTarget", "shotsOnTargetAgainst",
            "goals", "goalsAgainst",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Sem resposta do LLM");
  }

  let jsonString = typeof content === "string" ? content : "";
  if (Array.isArray(content) && content.length > 0) {
    const textContent = content.find((c: any) => c.type === "text") as any;
    jsonString = textContent?.text || "";
  }

  if (!jsonString) {
    throw new Error("Resposta do LLM sem conteúdo de texto");
  }

  // Clean up JSON string (remove markdown code blocks if present)
  jsonString = jsonString.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  const parsed = JSON.parse(jsonString);
  return {
    teamName: parsed.teamName || "Desconhecido",
    attacks: Number(parsed.attacks) || 0,
    attacksAgainst: Number(parsed.attacksAgainst) || 0,
    corners: Number(parsed.corners) || 0,
    cornersAgainst: Number(parsed.cornersAgainst) || 0,
    shots: Number(parsed.shots) || 0,
    shotsAgainst: Number(parsed.shotsAgainst) || 0,
    shotsOnTarget: Number(parsed.shotsOnTarget) || 0,
    shotsOnTargetAgainst: Number(parsed.shotsOnTargetAgainst) || 0,
    goals: Number(parsed.goals) || 0,
    goalsAgainst: Number(parsed.goalsAgainst) || 0,
  };
}

export const pdfImportRouter = router({
  /**
   * Import team data from a single uploaded PDF (sent as base64)
   */
  importFromPDF: publicProcedure
    .input(
      z.object({
        pdfBase64: z.string().min(1, "PDF data is required"),
        fileName: z.string().optional(),
        teamType: z.enum(["home", "away"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log(`[PDF Import] Processing ${input.teamType} team PDF: ${input.fileName || "unknown"}`);
        
        const extractedData = await extractStatsFromPDFBase64(input.pdfBase64);

        console.log(`[PDF Import] Extracted data for ${extractedData.teamName}:`, extractedData);

        return {
          success: true,
          data: extractedData,
          message: `Dados extraídos com sucesso para ${extractedData.teamName}`,
        };
      } catch (error) {
        console.error("[PDF Import] Error:", error);
        return {
          success: false,
          data: null,
          message: `Falha ao importar PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        };
      }
    }),

  /**
   * Import data from both PDFs at once (home and away teams)
   */
  importBothTeams: publicProcedure
    .input(
      z.object({
        homePdfBase64: z.string().min(1, "Home team PDF data is required"),
        awayPdfBase64: z.string().min(1, "Away team PDF data is required"),
        homeFileName: z.string().optional(),
        awayFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log(`[PDF Import] Processing both teams...`);
        console.log(`[PDF Import] Home: ${input.homeFileName || "unknown"}`);
        console.log(`[PDF Import] Away: ${input.awayFileName || "unknown"}`);

        // Process both PDFs in parallel
        const [homeData, awayData] = await Promise.all([
          extractStatsFromPDFBase64(input.homePdfBase64),
          extractStatsFromPDFBase64(input.awayPdfBase64),
        ]);

        console.log(`[PDF Import] Home team extracted:`, homeData);
        console.log(`[PDF Import] Away team extracted:`, awayData);

        return {
          success: true,
          data: {
            home: homeData,
            away: awayData,
          },
          message: `Dados extraídos com sucesso: ${homeData.teamName} vs ${awayData.teamName}`,
        };
      } catch (error) {
        console.error("[PDF Import] Error:", error);
        return {
          success: false,
          data: null,
          message: `Falha ao importar PDFs: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        };
      }
    }),
});
