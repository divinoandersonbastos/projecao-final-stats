import axios from "axios";
import * as cheerio from "cheerio";

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
 * Extrai dados estatísticos do CraqueStats através de web scraping
 */
export async function extractCraqueStatsData(
  teamUrl: string
): Promise<CraqueStatsTeamData | null> {
  try {
    if (!teamUrl.includes("craquestats.com.br/team/")) {
      throw new Error("URL inválida. Use o formato: https://craquestats.com.br/team/[ID]");
    }

    const client = axios.create({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      timeout: 10000,
    });

    const response = await client.get(teamUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    const teamName = $("h1").first().text().trim() || "Time Desconhecido";
    const stats = extractStatsFromTable($);

    return {
      teamName,
      finalizacoes: stats.finalizacoes,
      finalizacoesContra: stats.finalizacoesContra,
      escanteios: stats.escanteios,
      ataquesPerigosos: stats.ataquesPerigosos,
      gols: stats.gols,
      golsContra: stats.golsContra,
    };
  } catch (error) {
    console.error("[CraqueStats Scraper] Erro ao extrair dados:", error);
    return null;
  }
}

/**
 * Extrai estatísticas da tabela HTML
 */
function extractStatsFromTable($: cheerio.CheerioAPI) {
  const stats = {
    finalizacoes: 0,
    finalizacoesContra: 0,
    escanteios: 0,
    ataquesPerigosos: 0,
    gols: 0,
    golsContra: 0,
  };

  const rows = $("table tbody tr");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows.each(function (this: any) {
    const $row = $(this);
    const rowText = $row.text().toLowerCase();
    const cells = $row.find("td");

    if (rowText.includes("finalizações") || rowText.includes("shots")) {
      const values = extractNumericValues(cells, $);
      if (values.length >= 2) {
        stats.finalizacoes = values[0];
        stats.finalizacoesContra = values[1];
      }
    } else if (rowText.includes("escanteio") || rowText.includes("corner")) {
      const values = extractNumericValues(cells, $);
      if (values.length >= 1) {
        stats.escanteios = values[0];
      }
    } else if (rowText.includes("ataque perigoso") || rowText.includes("dangerous")) {
      const values = extractNumericValues(cells, $);
      if (values.length >= 1) {
        stats.ataquesPerigosos = values[0];
      }
    } else if (rowText.includes("gol") || rowText.includes("goal")) {
      const values = extractNumericValues(cells, $);
      if (values.length >= 2) {
        stats.gols = values[0];
        stats.golsContra = values[1];
      }
    }
  });

  return stats;
}

/**
 * Extrai valores numéricos de células HTML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNumericValues(cells: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): number[] {
  const values: number[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cells.each(function (this: any) {
    const text = $(this).text().trim();
    const num = parseFloat(text);
    if (!isNaN(num)) {
      values.push(num);
    }
  });

  return values;
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
