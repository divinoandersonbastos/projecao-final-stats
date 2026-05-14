import fs from "fs";

export interface ExtractedTeamData {
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
}

/**
 * Extract team statistics from CraqueStats PDF
 * Parses the table data from the PDF and extracts key metrics including defensive stats
 */
export async function extractTeamDataFromPDF(
  filePath: string
): Promise<ExtractedTeamData> {
  try {
    // Read PDF file
    const fileBuffer = fs.readFileSync(filePath);

    // Dynamically import pdf-parse to handle ESM
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || (pdfParseModule as any);

    // Parse PDF
    const pdfData = await pdfParse(fileBuffer);
    const text = pdfData.text;

    // Extract team name (appears at top of page)
    const teamNameMatch = text.match(/^[^0-9]*?(Flamengo|Vitória|[A-Z][a-z]+)/m);
    const teamName = teamNameMatch ? teamNameMatch[1] : "Unknown";

    // Extract statistics from the table
    const stats = parseStatisticsTable(text.split("\n"));

    return {
      teamName,
      attacks: stats.attacks,
      attacksAgainst: stats.attacksAgainst,
      corners: stats.corners,
      cornersAgainst: stats.cornersAgainst,
      shots: stats.shots,
      shotsAgainst: stats.shotsAgainst,
      shotsOnTarget: stats.shotsOnTarget,
      shotsOnTargetAgainst: stats.shotsOnTargetAgainst,
      goals: stats.goals,
      goalsAgainst: stats.goalsAgainst,
    };
  } catch (error) {
    console.error("Error extracting PDF data:", error);
    throw new Error(`Failed to extract data from PDF: ${error}`);
  }
}

/**
 * Parse statistics from the extracted text
 * CraqueStats table format shows pairs of values: "A Favor" and "Contra"
 */
function parseStatisticsTable(lines: string[]): Record<string, number> {
  const stats: Record<string, number> = {
    attacks: 0,
    attacksAgainst: 0,
    corners: 0,
    cornersAgainst: 0,
    shots: 0,
    shotsAgainst: 0,
    shotsOnTarget: 0,
    shotsOnTargetAgainst: 0,
    goals: 0,
    goalsAgainst: 0,
  };

  // Filter and clean lines
  const cleanedLines = lines
    .filter((line: string) => line.trim().length > 0)
    .map((line: string) => line.trim());

  // Join lines to search for patterns
  const fullText = cleanedLines.join(" ");

  // Extract pairs of values (A Favor and Contra)
  // CraqueStats format: "Metric A_Favor Contra" or similar

  // Extract Finalizações (Shots) - usually appears as "15.6" and "11.1"
  const shotsPattern = /Finalizações?\s+(\d+\.?\d*)\s+(\d+\.?\d*)/i;
  const shotsMatch = fullText.match(shotsPattern);
  if (shotsMatch) {
    stats.shots = parseFloat(shotsMatch[1]);
    stats.shotsAgainst = parseFloat(shotsMatch[2]);
  }

  // Extract Escanteios (Corners)
  const cornersPattern = /Escanteios?\s+(\d+\.?\d*)\s+(\d+\.?\d*)/i;
  const cornersMatch = fullText.match(cornersPattern);
  if (cornersMatch) {
    stats.corners = parseFloat(cornersMatch[1]);
    stats.cornersAgainst = parseFloat(cornersMatch[2]);
  }

  // Extract Finalizações no Gol (Shots on Target)
  const shotsOnTargetPattern = /Finalizações?\s+no\s+gol\s+(\d+\.?\d*)\s+(\d+\.?\d*)/i;
  const shotsOnTargetMatch = fullText.match(shotsOnTargetPattern);
  if (shotsOnTargetMatch) {
    stats.shotsOnTarget = parseFloat(shotsOnTargetMatch[1]);
    stats.shotsOnTargetAgainst = parseFloat(shotsOnTargetMatch[2]);
  }

  // Extract Gols (Goals)
  const goalsPattern = /Gols?\s+(\d+\.?\d*)\s+(\d+\.?\d*)/i;
  const goalsMatch = fullText.match(goalsPattern);
  if (goalsMatch) {
    stats.goals = parseFloat(goalsMatch[1]);
    stats.goalsAgainst = parseFloat(goalsMatch[2]);
  }

  // Extract Ataques Perigosos (Dangerous Attacks)
  const attacksPattern = /Ataques?\s+perigosos?\s+(\d+\.?\d*)\s+(\d+\.?\d*)/i;
  const attacksMatch = fullText.match(attacksPattern);
  if (attacksMatch) {
    stats.attacks = parseFloat(attacksMatch[1]);
    stats.attacksAgainst = parseFloat(attacksMatch[2]);
  }

  return stats;
}

/**
 * Batch extract data from multiple PDF files
 */
export async function extractMultipleTeams(
  filePaths: string[]
): Promise<ExtractedTeamData[]> {
  const results: ExtractedTeamData[] = [];

  for (const filePath of filePaths) {
    try {
      const data = await extractTeamDataFromPDF(filePath);
      results.push(data);
    } catch (error) {
      console.error(`Failed to extract data from ${filePath}:`, error);
    }
  }

  return results;
}
