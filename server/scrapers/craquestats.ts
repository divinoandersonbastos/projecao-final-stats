import axios from "axios";

export interface CraqueStatsTeamData {
  teamName: string;
  finalizacoes: number;
  finalizacoesContra: number;
  escanteios: number;
  ataquesPerigosos: number;
  gols: number;
  golsContra: number;
}

/**
 * Extrai dados estatísticos do CraqueStats
 * Nota: Como o CraqueStats é um SPA que carrega dados via JavaScript,
 * e requer autenticação, a abordagem ideal seria:
 * 1. Usar a API interna do site (se disponível)
 * 2. Implementar login automatizado
 * 3. Usar Puppeteer/Playwright para renderizar JavaScript
 *
 * Por enquanto, retornamos dados de exemplo para demonstração
 */
export async function extractCraqueStatsData(
  teamUrl: string
): Promise<CraqueStatsTeamData | null> {
  try {
    if (!teamUrl.includes("craquestats.com.br/team/")) {
      throw new Error("URL inválida. Use o formato: https://craquestats.com.br/team/[ID]");
    }

    const teamId = extractTeamIdFromUrl(teamUrl);
    if (!teamId) {
      throw new Error("Não foi possível extrair o ID do time da URL");
    }

    // Tentar extrair dados via API interna do CraqueStats
    // Esta é uma tentativa de acessar dados via endpoint JSON
    const apiUrl = `https://api.craquestats.com.br/team/${teamId}/stats`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 10000,
      });

      if (response.data && response.data.stats) {
        const stats = response.data.stats;
        return {
          teamName: response.data.name || "Time Desconhecido",
          finalizacoes: parseFloat(stats.shotsFor) || 0,
          finalizacoesContra: parseFloat(stats.shotsAgainst) || 0,
          escanteios: parseFloat(stats.cornersFor) || 0,
          ataquesPerigosos: parseFloat(stats.dangerousAttacksFor) || 0,
          gols: parseFloat(stats.goalsFor) || 0,
          golsContra: parseFloat(stats.goalsAgainst) || 0,
        };
      }
    } catch (apiError) {
      console.warn("[CraqueStats] API endpoint não disponível, tentando fallback...");
    }

    // Fallback: retornar dados de exemplo com instruções
    console.warn(
      "[CraqueStats] Não foi possível extrair dados automaticamente. Por favor, preencha os dados manualmente."
    );
    return null;
  } catch (error) {
    console.error("[CraqueStats Scraper] Erro ao extrair dados:", error);
    return null;
  }
}

/**
 * Extrai ID do time da URL
 */
export function extractTeamIdFromUrl(url: string): string | null {
  const match = url.match(/team\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Valida dados extraídos
 */
export function validateCraqueStatsData(data: CraqueStatsTeamData): boolean {
  return !!(
    data.teamName &&
    data.finalizacoes >= 0 &&
    data.finalizacoesContra >= 0 &&
    data.escanteios >= 0 &&
    data.ataquesPerigosos >= 0 &&
    data.gols >= 0 &&
    data.golsContra >= 0
  );
}

/**
 * Fornece instruções para importação manual de dados
 */
export function getManualImportInstructions(): string {
  return `
Como importar dados do CraqueStats manualmente:

1. Acesse https://craquestats.com.br
2. Faça login com sua conta Gmail
3. Procure pelo time desejado
4. Na página de estatísticas, identifique os seguintes valores:
   - Finalizações (Shots)
   - Finalizações no Gol (Shots on Target)
   - Escanteios (Corners)
   - Ataques Perigosos (Dangerous Attacks)
   - Gols (Goals)
5. Preencha os campos no formulário com os valores encontrados

Nota: A importação automática requer que o site forneça uma API pública.
Enquanto isso, você pode copiar os valores manualmente da tabela de estatísticas.
  `;
}
