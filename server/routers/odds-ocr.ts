import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

/**
 * Extract odds data from a pasted screenshot using LLM vision.
 * The user pastes a screenshot from a betting site showing odds for various markets.
 * The LLM extracts the structured data in the expected format.
 */
async function extractOddsFromImage(base64Data: string, mimeType: string): Promise<string> {
  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `Você é um especialista em extrair dados de odds (cotações) de screenshots de sites de apostas esportivas.

A imagem mostra uma tabela ou lista de odds de uma casa de apostas. Pode conter mercados como:
- Escanteios (Corners Over/Under)
- Gols (Goals Over/Under)
- Chutes/Finalizações (Shots Over/Under)
- Cartões (Cards Over/Under)
- Outros mercados com 3 opções (mais de / exatamente / menos de)

Sua tarefa é extrair TODAS as linhas de odds visíveis na imagem e retornar no formato:
Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos

Regras:
1. Cada linha deve ter exatamente 5 campos separados por " | "
2. "Mercado" = categoria (ex: Escanteios, Gols, Chutes, Cartões)
3. "Linha" = valor da linha (ex: "Acima 7.5", "Acima 2.5", "7 escanteios")
4. "Odd Mais" = odd para "mais de" ou "over" (valor decimal, ex: 2.15)
5. "Odd Exatamente" = odd para "exatamente" ou "exactly" (valor decimal, ex: 10.00)
6. "Odd Menos" = odd para "menos de" ou "under" (valor decimal, ex: 9.00)
7. Se a imagem mostrar apenas 2 opções (over/under sem "exatamente"), use 0 para Odd Exatamente
8. Extraia TODOS os mercados visíveis, não apenas os primeiros
9. Use ponto como separador decimal (ex: 2.15, não 2,15)
10. Se não conseguir identificar o mercado, use "Mercado" como nome genérico
11. Se houver múltiplas linhas do mesmo mercado (ex: Over 2.5, Over 3.5), inclua todas

IMPORTANTE:
- Retorne APENAS as linhas no formato especificado, sem explicações adicionais
- Uma linha por mercado/opção
- Se não conseguir extrair nenhuma odd da imagem, retorne "ERRO: Não foi possível identificar odds na imagem"`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extraia todas as odds desta imagem no formato: Mercado | Linha | Odd Mais | Odd Exatamente | Odd Menos",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM não retornou conteúdo");
  }

  // Content can be string or array
  const text = typeof content === "string"
    ? content
    : content.map(c => ("text" in c ? c.text : "")).join("\n");

  return text.trim();
}

export const oddsOcrRouter = router({
  /**
   * Extract odds from a pasted image using LLM vision OCR
   */
  extractFromImage: publicProcedure
    .input(
      z.object({
        imageBase64: z.string().min(100, "Imagem muito pequena"),
        mimeType: z.string().default("image/png"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const extractedText = await extractOddsFromImage(input.imageBase64, input.mimeType);

        if (extractedText.startsWith("ERRO:")) {
          return {
            success: false,
            data: null,
            message: extractedText,
          };
        }

        return {
          success: true,
          data: extractedText,
          message: "Odds extraídas com sucesso",
        };
      } catch (error: any) {
        return {
          success: false,
          data: null,
          message: `Erro ao processar imagem: ${error.message || "Erro desconhecido"}`,
        };
      }
    }),
});
