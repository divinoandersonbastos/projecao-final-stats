export interface RankingLine {
  rank: number;
  line: string;
  projection: number;
  baseline: number;
  absoluteMargin: number;
  percentageMargin: number;
  stability: "Alta" | "Média" | "Baixa";
  correlation: "Baixa" | "Média" | "Alta";
  confidenceIndex: number;
  status: "Forte" | "Boa" | "Média" | "Fraca" | "Sem sustentação";
  category: "A" | "B" | "C" | "D";
  isAlert: boolean;
  alertReason?: string;
}

export interface Analysis {
  id: number;
  userId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  analysisMode: "mode1" | "mode2";
  homeProjectedShots: number | string;
  awayProjectedShots: number | string;
  homeProjectedShotsOnTarget: number | string;
  awayProjectedShotsOnTarget: number | string;
  homeProjectedCorners: number | string;
  awayProjectedCorners: number | string;
  homeProjectedGoals: number | string;
  awayProjectedGoals: number | string;
  homeOffensiveConversion: number | string;
  homeDefensiveConversion: number | string;
  awayOffensiveConversion: number | string;
  awayDefensiveConversion: number | string;
  homePressureFactor: number | string;
  awayPressureFactor: number | string;
  projectedHomeGoals: number;
  projectedAwayGoals: number;
  rankingData: RankingLine[] | unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
}
