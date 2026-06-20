import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match } from "@/types";

export interface RenumberResult {
  matchesProcessed: number;
  errors: string[];
  success: boolean;
}

export async function renumberMatches(): Promise<RenumberResult> {
  const result: RenumberResult = {
    matchesProcessed: 0,
    errors: [],
    success: true,
  };

  try {
    const snap = await getDocs(collection(db, "matches"));
    const matches: (Match & { id: string })[] = snap.docs.map((d) => ({
      id: d.id,
      kickoffTime: d.data().kickoffTime,
      teamA: d.data().teamA,
      teamB: d.data().teamB,
      status: d.data().status,
      result: d.data().result,
      totalGoalsResult: d.data().totalGoalsResult,
      matchNumber: d.data().matchNumber,
    })) as (Match & { id: string })[];

    matches.sort((a, b) => {
      const ta = a.kickoffTime
        ? new Date(
            a.kickoffTime instanceof Object && "toDate" in a.kickoffTime
              ? (a.kickoffTime as { toDate(): Date }).toDate()
              : (a.kickoffTime as string | number)
          ).getTime()
        : 0;
      const tb = b.kickoffTime
        ? new Date(
            b.kickoffTime instanceof Object && "toDate" in b.kickoffTime
              ? (b.kickoffTime as { toDate(): Date }).toDate()
              : (b.kickoffTime as string | number)
          ).getTime()
        : 0;
      return ta - tb;
    });

    let batch = writeBatch(db);
    let count = 0;

    matches.forEach((m, i) => {
      const matchRef = doc(db, "matches", m.id);
      batch.update(matchRef, { matchNumber: i + 1 });
      count++;
      result.matchesProcessed++;

      if (count % 400 === 0) {
        batch.commit();
        batch = writeBatch(db);
      }
    });

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
