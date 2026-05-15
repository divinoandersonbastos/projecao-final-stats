// ============================================================
// Market Inefficiency Calculation Logic (shared)
// ============================================================

export interface OddsLine {
  market: string;
  line: string;
  oddOver: number;
  oddExact: number;
  oddUnder: number;
  impliedSum: number;
  theoreticalMargin: number;
  status: "high" | "medium" | "low" | "none";
  isBest: boolean;
}

export function calculateImpliedSum(oddOver: number, oddExact: number, oddUnder: number): number {
  return (1 / oddOver) + (1 / oddExact) + (1 / oddUnder);
}

export function calculateTheoreticalMargin(impliedSum: number): number {
  return (1 - impliedSum) * 100;
}

export function classifyStatus(margin: number): "high" | "medium" | "low" | "none" {
  if (margin > 10) return "high";
  if (margin >= 5) return "medium";
  if (margin > 0) return "low";
  return "none";
}

export function findBestLine(lines: OddsLine[]): number {
  const positiveLines = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => line.theoreticalMargin > 0);

  if (positiveLines.length === 0) return -1;

  positiveLines.sort((a, b) => {
    // 1. Maior margem teórica
    if (b.line.theoreticalMargin !== a.line.theoreticalMargin) {
      return b.line.theoreticalMargin - a.line.theoreticalMargin;
    }
    // 2. Menor soma implícita
    if (a.line.impliedSum !== b.line.impliedSum) {
      return a.line.impliedSum - b.line.impliedSum;
    }
    // 3. Maior odd mínima entre as três
    const minOddA = Math.min(a.line.oddOver, a.line.oddExact, a.line.oddUnder);
    const minOddB = Math.min(b.line.oddOver, b.line.oddExact, b.line.oddUnder);
    if (minOddB !== minOddA) {
      return minOddB - minOddA;
    }
    // 4. Primeira ocorrência
    return a.idx - b.idx;
  });

  return positiveLines[0].idx;
}

export function parseOddsInput(text: string): OddsLine[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  const results: OddsLine[] = [];

  for (const rawLine of lines) {
    const separators = ["|", ";", "\t"];
    let parts: string[] = [];

    for (const sep of separators) {
      if (rawLine.includes(sep)) {
        parts = rawLine.split(sep).map(p => p.trim());
        break;
      }
    }

    // If no separator found, try space-based parsing
    if (parts.length < 4) {
      const match = rawLine.match(/^(.+?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$/);
      if (match) {
        const textPart = match[1].trim();
        const lastSpaceIdx = textPart.lastIndexOf(" ");
        if (lastSpaceIdx > 0) {
          parts = [
            textPart.substring(0, lastSpaceIdx),
            textPart.substring(lastSpaceIdx + 1),
            match[2],
            match[3],
            match[4],
          ];
        } else {
          parts = [textPart, textPart, match[2], match[3], match[4]];
        }
      }
    }

    if (parts.length >= 5) {
      const oddOver = parseFloat(parts[2]);
      const oddExact = parseFloat(parts[3]);
      const oddUnder = parseFloat(parts[4]);

      if (!isNaN(oddOver) && !isNaN(oddExact) && !isNaN(oddUnder) && oddOver > 0 && oddUnder > 0) {
        // Support binary markets (oddExact = 0 means no "exactly" option)
        const impliedSum = oddExact > 0
          ? calculateImpliedSum(oddOver, oddExact, oddUnder)
          : (1 / oddOver) + (1 / oddUnder);
        const theoreticalMargin = calculateTheoreticalMargin(impliedSum);
        results.push({
          market: parts[0],
          line: parts[1],
          oddOver,
          oddExact,
          oddUnder,
          impliedSum,
          theoreticalMargin,
          status: classifyStatus(theoreticalMargin),
          isBest: false,
        });
      }
    } else if (parts.length >= 4) {
      const oddOver = parseFloat(parts[1]);
      const oddExact = parseFloat(parts[2]);
      const oddUnder = parseFloat(parts[3]);

      if (!isNaN(oddOver) && !isNaN(oddExact) && !isNaN(oddUnder) && oddOver > 0 && oddUnder > 0) {
        const impliedSum = oddExact > 0
          ? calculateImpliedSum(oddOver, oddExact, oddUnder)
          : (1 / oddOver) + (1 / oddUnder);
        const theoreticalMargin = calculateTheoreticalMargin(impliedSum);
        results.push({
          market: parts[0],
          line: parts[0],
          oddOver,
          oddExact,
          oddUnder,
          impliedSum,
          theoreticalMargin,
          status: classifyStatus(theoreticalMargin),
          isBest: false,
        });
      }
    }
  }

  // Find best line
  const bestIdx = findBestLine(results);
  if (bestIdx >= 0) {
    results[bestIdx].isBest = true;
  }

  return results;
}
