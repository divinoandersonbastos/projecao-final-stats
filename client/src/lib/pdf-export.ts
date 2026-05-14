import { Analysis } from "@/types/analysis";

export interface PDFExportOptions {
  filename?: string;
}

export async function exportAnalysisToPDF(
  analysis: Analysis,
  options: PDFExportOptions = {}
) {
  try {
    // Dynamic imports for PDF generation
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;

    const filename =
      options.filename ||
      `analise-${analysis.homeTeamName}-vs-${analysis.awayTeamName}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Create a temporary container for PDF content
    const container = document.createElement("div");
    container.style.cssText =
      "position: absolute; left: -9999px; width: 900px; background: white; padding: 20px; font-family: Arial, sans-serif;";

    container.innerHTML = generatePDFHTML(analysis);
    document.body.appendChild(container);

    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      // Save PDF
      pdf.save(filename);
    } finally {
      // Clean up temporary container
      document.body.removeChild(container);
    }
  } catch (error) {
    console.error("PDF export error:", error);
    throw new Error("Falha ao exportar PDF. Tente novamente.");
  }
}

function generatePDFHTML(analysis: Analysis): string {
  // Parse ranking data
  const rankingData = Array.isArray(analysis.rankingData)
    ? analysis.rankingData
    : typeof analysis.rankingData === "string"
    ? JSON.parse(analysis.rankingData)
    : [];

  const rankingByCategory: Record<string, any[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
  };
  rankingData.forEach((line: any) => {
    if (line.category in rankingByCategory) {
      rankingByCategory[line.category].push(line);
    }
  });

  // Generate ranking tables HTML
  const rankingTables = Object.entries(rankingByCategory)
    .filter(([_, lines]) => lines.length > 0)
    .map(
      ([category, lines]) => `
    <div style="margin-bottom: 25px;">
      <h3 style="color: #1e40af; font-size: 14px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px;">
        ${category === "A" ? "Escanteios (A)" : category === "B" ? "Finalizações (B)" : category === "C" ? "Finalizações no Gol (C)" : "Gols (D)"}
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tr style="background: #f3f4f6;">
          <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">Rank</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">Linha</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold; text-align: center;">Projeção</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold; text-align: center;">Margem %</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold; text-align: center;">Estabilidade</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold; text-align: center;">Confiança</td>
        </tr>
        ${lines
          .slice(0, 5)
          .map(
            (line) => `
        <tr style="background: ${lines.indexOf(line) % 2 === 0 ? "#ffffff" : "#f9fafb"};">
          <td style="padding: 6px; border: 1px solid #e5e7eb;">${line.rank}</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb;">${line.line}</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: center;">${line.projection.toFixed(2)}</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: center; color: ${line.percentageMargin > 40 ? "#dc2626" : "#16a34a"};">${line.percentageMargin.toFixed(1)}%</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: center;">${line.stability}</td>
          <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: center;">${(line.confidenceIndex * 100).toFixed(0)}%</td>
        </tr>
        `
          )
          .join("")}
      </table>
    </div>
  `
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 15px;">
        <h1 style="color: #1e40af; margin: 0 0 10px 0; font-size: 28px;">Projeção Final Stats</h1>
        <p style="color: #666; margin: 0; font-size: 12px;">Relatório de Análise Estatística de Futebol</p>
        <p style="color: #999; margin: 5px 0 0 0; font-size: 11px;">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      </div>

      <!-- Match Section -->
      <div style="margin-bottom: 25px;">
        <h2 style="color: #1e40af; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">Jogo</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; background: #f3f4f6; font-weight: bold; width: 50%;">Time Mandante</td>
            <td style="padding: 8px; background: #f3f4f6;">${analysis.homeTeamName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Time Visitante</td>
            <td style="padding: 8px;">${analysis.awayTeamName}</td>
          </tr>
        </table>
      </div>

      <!-- Dados Extraídos Section -->
      <div style="margin-bottom: 25px;">
        <h2 style="color: #1e40af; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">Dados Extraídos</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #dbeafe;">
            <td style="padding: 8px; border: 1px solid #bfdbfe; font-weight: bold; width: 35%;">Métrica</td>
            <td style="padding: 8px; border: 1px solid #bfdbfe; font-weight: bold; text-align: center;">${analysis.homeTeamName}</td>
            <td style="padding: 8px; border: 1px solid #bfdbfe; font-weight: bold; text-align: center;">${analysis.awayTeamName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Finalizações</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.homeProjectedShots).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.awayProjectedShots).toFixed(2)}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Finalizações no Gol</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.homeProjectedShotsOnTarget).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.awayProjectedShotsOnTarget).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Escanteios</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.homeProjectedCorners).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.awayProjectedCorners).toFixed(2)}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Gols Esperados</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${Number(analysis.homeProjectedGoals).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${Number(analysis.awayProjectedGoals).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Projeções Section -->
      <div style="margin-bottom: 25px;">
        <h2 style="color: #1e40af; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">Projeções do Modelo</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Métrica</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; text-align: center;">${analysis.homeTeamName}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; text-align: center;">${analysis.awayTeamName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Finalizações Projetadas</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.homeProjectedShots).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.awayProjectedShots).toFixed(2)}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Finalizações no Gol Projetadas</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.homeProjectedShotsOnTarget).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.awayProjectedShotsOnTarget).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Escanteios Projetados</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.homeProjectedCorners).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${Number(analysis.awayProjectedCorners).toFixed(2)}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Gols Esperados (xG)</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${Number(analysis.homeProjectedGoals).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${Number(analysis.awayProjectedGoals).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Final Result Section -->
      <div style="margin-bottom: 25px; background: #f0f9ff; padding: 15px; border-left: 4px solid #1e40af;">
        <h2 style="color: #1e40af; font-size: 18px; margin-top: 0; margin-bottom: 12px;">Projeção Final (FTHG x FTAG)</h2>
        <div style="text-align: center;">
          <p style="font-size: 36px; font-weight: bold; margin: 0;">
            ${Math.round(Number(analysis.projectedHomeGoals))} x ${Math.round(Number(analysis.projectedAwayGoals))}
          </p>
          <p style="color: #666; margin: 10px 0 0 0;">${analysis.homeTeamName} x ${analysis.awayTeamName}</p>
        </div>
      </div>

      <!-- Ranking Section -->
      <div style="margin-bottom: 25px;">
        <h2 style="color: #1e40af; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px;">Ranking das Melhores Linhas Estatísticas</h2>
        ${rankingTables}
      </div>

      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 11px;">
        <p style="margin: 0;">Projeção Final Stats - Ferramenta de Análise Estatística de Futebol</p>
        <p style="margin: 5px 0 0 0;">Este relatório foi gerado automaticamente e deve ser utilizado como ferramenta de apoio a decisões.</p>
      </div>
    </div>
  `;
}
