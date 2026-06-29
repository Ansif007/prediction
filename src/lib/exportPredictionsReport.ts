import * as XLSX from "xlsx-js-style";
import { collection, getDocs, Firestore, Timestamp } from "firebase/firestore";
import { Match, Prediction, UserData } from "@/types";

const HEADER_FILL = { fgColor: { rgb: "1B365D" } };
const HEADER_FONT = { color: { rgb: "FFFFFF" }, bold: true };
const ZEBRA_FILL = { fgColor: { rgb: "F3F4F6" } };
const PENDING_FILL = { fgColor: { rgb: "FFF8E1" } };

type CellStyle = {
  fill?: { fgColor: { rgb: string } };
  font?: { color?: { rgb: string }; bold?: boolean };
  alignment?: { horizontal?: string; vertical?: string };
};

function styleCell(
  ws: XLSX.WorkSheet,
  cellRef: string,
  value: string | number,
  style: CellStyle
) {
  ws[cellRef] = { v: value, t: typeof value === "number" ? "n" : "s", s: style };
}

function applyHeaderRow(ws: XLSX.WorkSheet, headers: string[], rowIndex: number) {
  headers.forEach((header, colIndex) => {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    styleCell(ws, cellRef, header, {
      fill: HEADER_FILL,
      font: HEADER_FONT,
      alignment: { horizontal: "center", vertical: "center" },
    });
  });
}

function buildSummarySheet(total: number, pending: number, settled: number) {
  const ws: XLSX.WorkSheet = {};
  const rows: [string, string | number][] = [
    ["Metric", "Value"],
    ["Total Accumulated Predictions", total],
    ["Pending Determinations", pending],
    ["Settled Finalizations", settled],
    ["Generated At", new Date().toLocaleString()],
  ];

  rows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const isHeader = rowIndex === 0;
      styleCell(ws, cellRef, value, {
        fill: isHeader ? HEADER_FILL : rowIndex % 2 === 0 ? ZEBRA_FILL : undefined,
        font: isHeader ? HEADER_FONT : undefined,
        alignment: { horizontal: "left", vertical: "center" },
      });
    });
  });

  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 1 } });
  ws["!cols"] = [{ wch: 36 }, { wch: 24 }];
  return ws;
}

function formatToIST(value: string | Timestamp | undefined | null): string {
  if (!value) return 'N/A';
  const date = typeof value === 'string' ? new Date(value) : value.toDate();
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getOutcomeStatus(prediction: Prediction, match?: Match): "Pending" | "Settled" {
  if (prediction.pointsAwarded || match?.status === "completed") {
    return "Settled";
  }
  return "Pending";
}

export async function exportMasterPredictionsReport(
  firestore: Firestore,
  users: UserData[],
  matches: Match[]
) {
  const predictionsSnap = await getDocs(collection(firestore, "predictions"));
  const predictions = predictionsSnap.docs.map(
    (docItem) => ({ id: docItem.id, ...docItem.data() }) as Prediction
  );

  const matchMap = new Map(matches.map((match) => [match.id, match]));
  const userMap = new Map(users.map((user) => [user.uid, user]));

  let pendingCount = 0;
  let settledCount = 0;

  const masterRows = predictions.map((prediction) => {
    const match = matchMap.get(prediction.matchId);
    const user = userMap.get(prediction.uid);
    const status = getOutcomeStatus(prediction, match);

    if (status === "Pending") pendingCount += 1;
    else settledCount += 1;

    return {
      status,
      values: [
        prediction.id,
        user?.employeeId || prediction.uid || 'N/A',
        user?.name || 'Unknown',
        match ? `${match.teamA} vs ${match.teamB}` : prediction.matchId,
        prediction.winnerPrediction,
        prediction.goalsPrediction,
        formatToIST(prediction.updatedAt),
        status,
        prediction.pointsEarned ?? 0,
      ] as (string | number)[],
    };
  });

  const wb = XLSX.utils.book_new();
  const summarySheet = buildSummarySheet(predictions.length, pendingCount, settledCount);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Export Summary");

  const headers = [
    "Prediction ID",
    "Employee ID / Reference",
    "User Name",
    "Match Details",
    "Predicted Winner",
    "Predicted Score",
    "Updated At",
    "Outcome Status",
    "Points Awarded",
  ];

  const masterSheet: XLSX.WorkSheet = {};
  applyHeaderRow(masterSheet, headers, 0);

  masterRows.forEach((row, rowIndex) => {
    const sheetRow = rowIndex + 1;
    const isZebra = sheetRow % 2 === 0;
    const isPending = row.status === "Pending";

    row.values.forEach((value, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: sheetRow, c: colIndex });
      styleCell(masterSheet, cellRef, value, {
        fill: isPending ? PENDING_FILL : isZebra ? ZEBRA_FILL : undefined,
        alignment: { horizontal: "left", vertical: "center" },
      });
    });
  });

  masterSheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: masterRows.length, c: headers.length - 1 },
  });
  masterSheet["!cols"] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 25 },
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, masterSheet, "Master Predictions Array");
  XLSX.writeFile(wb, "predictions_master_report.xlsx");
}
