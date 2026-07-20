import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match, Prediction, RoundPointsData, UserData } from "@/types";
import { roundKeyFromMatchNumber } from "@/lib/utils";

export interface BackfillResult {
  usersProcessed: number;
  predictionsProcessed: number;
  errors: string[];
  success: boolean;
}

export async function backfillRoundPoints(): Promise<BackfillResult> {
  const result: BackfillResult = {
    usersProcessed: 0,
    predictionsProcessed: 0,
    errors: [],
    success: true,
  };

  try {
    // 1. Fetch all matches to build matchId -> matchNumber map
    const matchSnap = await getDocs(collection(db, "matches"));
    const matchMap = new Map<string, number>();
    for (const d of matchSnap.docs) {
      const data = d.data();
      if (data.matchNumber) {
        matchMap.set(d.id, data.matchNumber);
      }
    }

    // 2. Fetch predictions with pointsAwarded
    const predSnap = await getDocs(collection(db, "predictions"));
    const preds = predSnap.docs.map((d) => ({
      ...(d.data() as Prediction),
      id: d.id,
    }));

    // 3. Accumulate points per user per round
    const acc = new Map<
      string,
      { name: string; round1: number; round2: number; round3: number; knockout: number; final8: number; overall: number }
    >();

    for (const p of preds) {
      if (!p.pointsEarned || !p.pointsAwarded) continue;

      const matchNumber = matchMap.get(p.matchId);
      if (!matchNumber) {
        result.errors.push(`Match ${p.matchId}: no matchNumber found`);
        continue;
      }

      const roundKey = roundKeyFromMatchNumber(matchNumber);
      const entry = acc.get(p.uid) || {
        name: p.userName || "",
        round1: 0,
        round2: 0,
        round3: 0,
        knockout: 0,
        final8: 0,
        overall: 0,
      };

      if (roundKey === "round1") entry.round1 += p.pointsEarned;
      else if (roundKey === "round2") entry.round2 += p.pointsEarned;
      else if (roundKey === "round3") entry.round3 += p.pointsEarned;
      else if (roundKey === "knockout") entry.knockout += p.pointsEarned;
      else if (roundKey === "final8") entry.final8 += p.pointsEarned;
      entry.overall += p.pointsEarned;
      if (!entry.name && p.userName) entry.name = p.userName;
      acc.set(p.uid, entry);
      result.predictionsProcessed++;
    }

    // 4. Fetch existing roundPoints docs to preserve incremental scores
    const existingRpSnap = await getDocs(collection(db, "roundPoints"));
    const existingRp = new Map<string, RoundPointsData>();
    existingRpSnap.docs.forEach((d) => {
      existingRp.set(d.id, { ...(d.data() as Omit<RoundPointsData, "id">), id: d.id });
    });

    // 5. Fetch users for name/department fallback
    const userSnap = await getDocs(collection(db, "users"));
    const userMap = new Map(userSnap.docs.map((d) => [d.id, d.data()]));

    // 6. Batch write roundPoints docs (idempotent merge: takes max of existing vs computed)
    let batch = writeBatch(db);
    let count = 0;

    for (const [uid, data] of acc) {
      const existing = existingRp.get(uid);
      const u = userMap.get(uid);

      // Take max of existing incremental scores vs computed backfill
      const round1 = existing ? Math.max(existing.round1, data.round1) : data.round1;
      const round2 = existing ? Math.max(existing.round2, data.round2) : data.round2;
      const round3 = existing ? Math.max(existing.round3, data.round3) : data.round3;
      const knockout = existing ? Math.max(existing.knockout, data.knockout) : data.knockout;
      const final8 = existing ? Math.max(existing.final8, data.final8) : data.final8;

      const rpData: RoundPointsData = {
        id: uid,
        uid,
        name: data.name || u?.name || "",
        department: u?.department || "",
        showOnLeaderboard: u?.showOnLeaderboard !== false,
        round1,
        round2,
        round3,
        knockout,
        final8,
        overall: round1 + round2 + round3 + knockout + final8,
      };

      batch.set(doc(db, "roundPoints", uid), rpData);
      count++;
      result.usersProcessed++;

      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }

    if (count % 400 !== 0) {
      await batch.commit();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    result.success = false;
  }

  return result;
}

export async function backfillFullScores(): Promise<BackfillResult> {
  const result: BackfillResult = {
    usersProcessed: 0,
    predictionsProcessed: 0,
    errors: [],
    success: true,
  };

  try {
    const matchSnap = await getDocs(collection(db, "matches"));
    const matchMap = new Map<string, Match>();
    for (const d of matchSnap.docs) {
      matchMap.set(d.id, { ...(d.data() as Omit<Match, "id">), id: d.id });
    }

    const predSnap = await getDocs(collection(db, "predictions"));
    const preds = predSnap.docs.map((d) => ({
      ...(d.data() as Prediction),
      id: d.id,
    }));

    const fullScoreCounts = new Map<string, number>();

    for (const p of preds) {
      if (!p.pointsAwarded) continue;

      const match = matchMap.get(p.matchId);
      if (!match || !match.result || !match.totalGoalsResult) {
        result.errors.push(`Match ${p.matchId}: missing result data`);
        continue;
      }

      const bothCorrect =
        p.winnerPrediction === match.result &&
        p.goalsPrediction === match.totalGoalsResult;

      if (bothCorrect) {
        fullScoreCounts.set(p.uid, (fullScoreCounts.get(p.uid) || 0) + 1);
      }

      result.predictionsProcessed++;
    }

    let batch = writeBatch(db);
    let count = 0;

    for (const [uid, fullScores] of fullScoreCounts) {
      batch.set(doc(db, "users", uid), { fullScores }, { merge: true });
      count++;
      result.usersProcessed++;

      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }

    if (count % 400 !== 0) {
      await batch.commit();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    result.success = false;
  }

  return result;
}
