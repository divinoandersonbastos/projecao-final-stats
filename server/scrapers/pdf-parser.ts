import * as fs from "fs";

export interface ExtractedTeamData {
  teamName: string;
  attacks: number;
  corners: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  goalsAgainst: number;
}

/**
 * Extract team statistics from CraqueStats PDF
 * Parses the table data from the PDF and extracts key metrics
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
      corners: stats.corners,
      shots: stats.shots,
      shotsOnTarget: stats.shotsOnTarget,
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
 * Looks for specific patterns in CraqueStats table format
 */
function parseStatisticsTable(lines: string[]): Record<string, number> {
  const stats: Record<string, number> = {
    attacks: 0,
    corners: 0,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    goalsAgainst: 0,
  };

  // Filter and clean lines
  const cleanedLines = lines
    .filter((line: string) => line.trim().length > 0)
    .map((line: string) => line.trim());

  // Join lines to search for patterns
  const fullText = cleanedLines.join(" ");

  // Extract numerical values using regex patterns
  // CraqueStats format typically shows values like "15.6" for shots

  // Look for finalizações (shots) - typically appears with decimal
  const shotsMatch = fullText.match(
    /(?:Finalizações?|Shots?)[\s\S]*?(\d+\.?\d*)/i
  );
  if (shotsMatch) {
    stats.shots = parseFloat(shotsMatch[1]);
  }

  // Look for escanteios (corners)
  const cornersMatch = fullText.match(
    /(?:Escanteios?|Corners?)[\s\S]*?(\d+\.?\d*)/i
  );
  if (cornersMatch) {
    stats.corners = parseFloat(cornersMatch[1]);
  }

  // Look for finalizações no gol (shots on target)
  const shotsOnTargetMatch = fullText.match(
    /(?:Finalizações? no gol|Shots? on target)[\s\S]*?(\d+\.?\d*)/i
  );
  if (shotsOnTargetMatch) {
    stats.shotsOnTarget = parseFloat(shotsOnTargetMatch[1]);
  }

  // Look for gols (goals)
  const goalsMatch = fullText.match(/(?:Gols?|Goals?)[\s\S]*?(\d+\.?\d*)/i);
  if (goalsMatch) {
    stats.goals = parseFloat(goalsMatch[1]);
  }

  // Look for ataques perigosos (dangerous attacks)
  const attacksMatch = fullText.match(
    /(?:Ataques? perigosos?|Dangerous attacks?)[\s\S]*?(\d+\.?\d*)/i
  );
  if (attacksMatch) {
    stats.attacks = parseFloat(attacksMatch[1]);
  }

  // If we couldn't extract from text, try to find numbers in specific positions
  // This is a fallback for when the PDF structure is different
  if (stats.shots === 0 && stats.corners === 0) {
    // Try to find the main statistics table
    const numberSequences = fullText.match(/\d+\.?\d*\s+\d+\.?\d*\s+\d+\.?\d*/g);
    if (numberSequences && numberSequences.length > 0) {
      // Parse the first few number sequences as our main stats
      const numbers = numberSequences[0]
        .split(/\s+/)
        .map((n: string) => parseFloat(n));
      if (numbers.length >= 3) {
        stats.shots = numbers[0];
        stats.shotsOnTarget = numbers[1];
        stats.corners = numbers[2];
      }
    }
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
      console.error(`Failed to extract from ${filePath}:`, error);
    }
  }

  return results;
}
