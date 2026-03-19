import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { FOP_PDF_DIR } from "@/lib/fop-pdf-path";

export const runtime = "nodejs";

function safe(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    const body = await req.json();

    const reportCode = safe(body?.reportCode || "DOR").toUpperCase();
    const reportDate = safe(body?.reportDate || "2026-03-16");

    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001";

    const previewUrl = `${baseUrl}/fop-preview/${reportCode}?date=${reportDate}`;

    await fs.mkdir(FOP_PDF_DIR, { recursive: true });

    const pngPath = path.join(FOP_PDF_DIR, `${reportCode}_${reportDate}.png`);
    const pdfPath = path.join(FOP_PDF_DIR, `${reportCode}_${reportDate}.pdf`);

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 2200 },
      deviceScaleFactor: 2,
    });

    await page.goto(previewUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.emulateMedia({ media: "screen" });
    await page.waitForLoadState("networkidle").catch(() => null);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: pngPath,
      type: "png",
      fullPage: true,
    });

    const pngBytes = await fs.readFile(pngPath);

    const pdfDoc = await PDFDocument.create();
    const pngImage = await pdfDoc.embedPng(pngBytes);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 20;

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const scaleX = usableWidth / pngImage.width;
    const scaleY = usableHeight / pngImage.height;
    const scale = Math.min(scaleX, scaleY);

    const drawWidth = pngImage.width * scale;
    const drawHeight = pngImage.height * scale;

    const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

    pdfPage.drawImage(pngImage, {
      x: (pageWidth - drawWidth) / 2,
      y: pageHeight - margin - drawHeight,
      width: drawWidth,
      height: drawHeight,
    });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(pdfPath, pdfBytes);

    return NextResponse.json({
      ok: true,
      fileName: `${reportCode}_${reportDate}.pdf`,
      pdfUrl: `/api/fop/pdf/${reportCode}_${reportDate}.pdf`,
    });
  } catch (error) {
    console.error("GENERATE PDF ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "PDF generation failed.",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}