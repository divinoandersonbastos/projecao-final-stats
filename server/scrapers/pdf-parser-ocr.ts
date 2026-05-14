import fs from "fs";
import { PDFParse } from "pdf-parse";
import { invokeLLM } from "../_core/llm";

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
 * Extract team statistics from CraqueStats PDF using OCR via LLM
 * Handles both text-based and scanned (image-based) PDFs
 */
export async function extractTeamDataFromPDFWithOCR(
  filePath: string
): Promise<ExtractedTeamData> {
  try {
    // Read PDF file
    const fileBuffer = fs.readFileSync(filePath);

    // First, try to extract text directly from PDF
    const parser = new PDFParse({ data: fileBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;

    // If we have meaningful text, use it
    if (text && text.trim().length > 50) {
      return parseStatisticsFromText(text);
    }

    // If PDF is scanned (no text), extract images and use LLM for OCR
    console.log("PDF appears to be scanned, using LLM for OCR...");
    return await extractUsingLLMOCR(filePath, fileBuffer);
  } catch (error) {
    console.error("Error extracting PDF data:", error);
    throw new Error(`Failed to extract data from PDF: ${error}`);
  }
}

/**
 * Extract data using LLM with vision capabilities for scanned PDFs
 */
async function extractUsingLLMOCR(
  filePath: string,
  fileBuffer: Buffer
): Promise<ExtractedTeamData> {
  try {
    // Convert PDF to images for LLM analysis
    // For now, we'll use a simple approach: upload the PDF and ask LLM to analyze it
    const base64Data = fileBuffer.toString("base64");
    const pdfUrl = `data:application/pdf;base64,${base64Data}`;

    // Call LLM with vision capabilities to extract football statistics
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting football statistics from CraqueStats PDFs.
Extract the following statistics from the PDF image:
- Team name
- Ataques Perigosos (Dangerous Attacks) - both "A Favor" (offensive) and "Contra" (defensive)
- Escanteios (Corners) - both offensive and defensive
- Finalizações (Shots) - both offensive and defensive
- Finalizações no Gol (Shots on Target) - both offensive and defensive
- Gols (Goals) - both offensive and defensive

Return the data as JSON with this exact structure:
{
  "teamName": "string",
  "attacks": number,
  "attacksAgainst": number,
  "corners": number,
  "cornersAgainst": number,
  "shots": number,
  "shotsAgainst": number,
  "shotsOnTarget": number,
  "shotsOnTargetAgainst": number,
  "goals": number,
  "goalsAgainst": number
}

If a value is not found, use 0. All values should be numbers.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract the football statistics from this CraqueStats PDF:",
            },
            {
              type: "file_url",
              file_url: {
                url: pdfUrl,
                mime_type: "application/pdf",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "football_stats",
          strict: true,
          schema: {
            type: "object",
            properties: {
              teamName: { type: "string" },
              attacks: { type: "number" },
              attacksAgainst: { type: "number" },
              corners: { type: "number" },
              cornersAgainst: { type: "number" },
              shots: { type: "number" },
              shotsAgainst: { type: "number" },
              shotsOnTarget: { type: "number" },
              shotsOnTargetAgainst: { type: "number" },
              goals: { type: "number" },
              goalsAgainst: { type: "number" },
            },
            required: [
              "teamName",
              "attacks",
              "attacksAgainst",
              "corners",
              "cornersAgainst",
              "shots",
              "shotsAgainst",
              "shotsOnTarget",
              "shotsOnTargetAgainst",
              "goals",
              "goalsAgainst",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    // Handle both string and array content types
    let jsonString = typeof content === "string" ? content : "";
    if (Array.isArray(content) && content.length > 0) {
      const textContent = content.find((c: any) => c.type === "text") as any;
      jsonString = textContent?.text || "";
    }

    if (!jsonString) {
      throw new Error("No text content in LLM response");
    }

    const extractedData = JSON.parse(jsonString);

    // Validate the extracted data
    if (!extractedData.teamName) {
      throw new Error("Failed to extract team name from PDF");
    }

    return {
      teamName: extractedData.teamName,
      attacks: extractedData.attacks || 0,
      attacksAgainst: extractedData.attacksAgainst || 0,
      corners: extractedData.corners || 0,
      cornersAgainst: extractedData.cornersAgainst || 0,
      shots: extractedData.shots || 0,
      shotsAgainst: extractedData.shotsAgainst || 0,
      shotsOnTarget: extractedData.shotsOnTarget || 0,
      shotsOnTargetAgainst: extractedData.shotsOnTargetAgainst || 0,
      goals: extractedData.goals || 0,
      goalsAgainst: extractedData.goalsAgainst || 0,
    };
  } catch (error) {
    console.error("Error using LLM for OCR:", error);
    throw new Error(`Failed to extract data using LLM: ${error}`);
  }
}

/**
 * Parse statistics from extracted text
 * CraqueStats table format shows pairs of values: "A Favor" and "Contra"
 */
function parseStatisticsFromText(text: string): ExtractedTeamData {
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

  // Extract team name (appears at top of page)
  const teamNameMatch = text.match(
    /^[^0-9]*?(Flamengo|Vitória|[A-Z][a-z]+)/m
  );
  const teamName = teamNameMatch ? teamNameMatch[1] : "Unknown";

  // Filter and clean lines
  const lines = text.split("\n");
  const cleanedLines = lines
    .filter((line: string) => line.trim().length > 0)
    .map((line: string) => line.trim());

  // Join lines to search for patterns
  const fullText = cleanedLines.join(" ");

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
  const shotsOnTargetPattern =
    /Finalizações?\s+no\s+gol\s+(\d+\.?\d*)\s+(\d+\.?\d*)/i;
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
}

/**
 * Batch extract data from multiple PDF files
 */
export async function extractMultipleTeamsWithOCR(
  filePaths: string[]
): Promise<ExtractedTeamData[]> {
  const results: ExtractedTeamData[] = [];

  for (const filePath of filePaths) {
    try {
      const data = await extractTeamDataFromPDFWithOCR(filePath);
      results.push(data);
    } catch (error) {
      console.error(`Failed to extract data from ${filePath}:`, error);
    }
  }

  return results;
}
