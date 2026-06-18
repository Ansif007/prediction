/**
 * One-time migration script to assign matchNumber to existing matches.
 *
 * Prerequisites:
 *   1. npm install firebase-admin
 *   2. Download a service account key from Firebase Console → Project Settings → Service Accounts
 *   3. Save as serviceAccountKey.json in the project root (gitignored)
 *   4. Set GOOGLE_APPLICATION_CREDENTIALS or update the path below
 *
 * Usage:
 *   node scripts/assignMatchNumbers.mjs
 *
 * What it does:
 *   1. Fetches all matches ordered by kickoffTime ASC
 *   2. Assigns matchNumber 1..N sequentially (validates no duplicates)
 *   3. For completed matches, reads predictions and aggregates round points
 *   4. Writes roundResults/{roundId} and roundWinners/{roundId} docs
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Round definitions (must match src/lib/utils.ts)
const ROUNDS = [
  { id: "round1", name: "Round 1", startMatch: 1, endMatch: 24 },
  { id: "round2", name: "Round 2", startMatch: 25, endMatch: 48 },
  { id: "round3", name: "Round 3", startMatch: 49, endMatch: 72 },
  { id: "round4", name: "Round 4", startMatch: 73, endMatch: 96 },
  { id: "knockout", name: "Knockout", startMatch: 97, endMatch: 104 },
];

async function main() {
  // Initialize Firebase Admin
  if (getApps().length === 0) {
    let serviceAccount;
    try {
      const keyPath = resolve(__dirname, "..", "serviceAccountKey.json");
      serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
    } catch {
      console.error(
        "Missing serviceAccountKey.json. Download from Firebase Console → Project Settings → Service Accounts."
      );
      process.exit(1);
    }
    initializeApp({ credential: cert(serviceAccount) });
  }

  const db = getFirestore();
  console.log("Connected to Firestore");

  // 1. Fetch all matches ordered by kickoffTime
  const matchesSnap = await db.collection("matches").orderBy("kickoffTime", "asc").get();
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Found ${matches.length} matches`);

  // 2. Assign matchNumber
  const updates = [];
  const seenNumbers = new Set();
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchNumber = i + 1;

    if (match.matchNumber && match.matchNumber === matchNumber) {
      // Already has the correct number
      continue;
    }

    if (seenNumbers.has(matchNumber)) {
      console.error(`Duplicate match number ${matchNumber} detected — aborting`);
      process.exit(1);
    }
    seenNumbers.add(matchNumber);

    updates.push({
      id: match.id,
      matchNumber,
      oldNumber: match.matchNumber,
    });
  }

  if (updates.length === 0) {
    console.log("All matches already have correct matchNumbers");
  } else {
    console.log(`Assigning matchNumbers to ${updates.length} matches...`);
    const batch = db.batch();
    for (const u of updates) {
      console.log(`  Match ${u.id}: ${u.oldNumber || "none"} → ${u.matchNumber}`);
      batch.update(db.collection("matches").doc(u.id), { matchNumber: u.matchNumber });
    }
    await batch.commit();
    console.log("Match numbers saved");
  }

  // 3. Build matchNumber lookup
  const matchNumberMap = new Map();
  for (const match of matches) {
    const mn = match.matchNumber || updates.find((u) => u.id === match.id)?.matchNumber;
    if (mn) matchNumberMap.set(match.id, mn);
  }

  // 4. For each round, compute standings
  const allUsersSnap = await db.collection("users").get();
  const allUsers = allUsersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const allPredictionsSnap = await db.collection("predictions").get();
  const allPredictions = allPredictionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  console.log(`Processing ${allPredictions.length} predictions across ${allUsers.length} users`);

  for (const round of ROUNDS) {
    console.log(`\n--- ${round.name} ---`);

    const roundPredictions = allPredictions.filter((p) => {
      if (!p.pointsAwarded) return false;
      const mn = matchNumberMap.get(p.matchId);
      return mn !== undefined && mn >= round.startMatch && mn <= round.endMatch;
    });

    console.log(`  Predictions in range: ${roundPredictions.length}`);

    // Aggregate per user
    const userPoints = new Map();
    roundPredictions.forEach((p) => {
      const uid = p.uid;
      const cur = userPoints.get(uid) || { points: 0, winnerHits: 0, exactScoreHits: 0 };
      cur.points += p.pointsEarned || 0;
      if (p.winnerHit) cur.winnerHits++;
      if (p.goalsHit) cur.exactScoreHits++;
      userPoints.set(uid, cur);
    });

    const rankings = allUsers
      .filter((u) => u.role !== "admin")
      .map((u, i) => {
        const stats = userPoints.get(u.id || u.uid) || { points: 0, winnerHits: 0, exactScoreHits: 0 };
        return {
          rank: i + 1,
          userId: u.id || u.uid,
          name: u.name || "",
          department: u.department,
          points: stats.points,
          winnerHits: stats.winnerHits,
          exactScoreHits: stats.exactScoreHits,
        };
      })
      .filter((e) => e.points > 0)
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((e, i) => ({ ...e, rank: i + 1 }))
      .slice(0, 50);

    // Write roundResults
    await db.collection("roundResults").doc(round.id).set({
      roundId: round.id,
      rankings,
      generatedAt: new Date().toISOString(),
    });
    console.log(`  roundResults/${round.id} — ${rankings.length} entries`);

    // Write roundWinners (top 3)
    const top3 = rankings.slice(0, 3);
    const winnerDoc = {
      roundId: round.id,
      firstPlaceUserId: top3[0]?.userId || "",
      firstPlaceName: top3[0]?.name || "",
      firstPlacePoints: top3[0]?.points || 0,
      secondPlaceUserId: top3[1]?.userId || "",
      secondPlaceName: top3[1]?.name || "",
      secondPlacePoints: top3[1]?.points || 0,
      thirdPlaceUserId: top3[2]?.userId || "",
      thirdPlaceName: top3[2]?.name || "",
      thirdPlacePoints: top3[2]?.points || 0,
      generatedAt: new Date().toISOString(),
    };
    await db.collection("roundWinners").doc(round.id).set(winnerDoc);

    if (top3.length > 0) {
      console.log(`  roundWinners/${round.id} — 1st: ${top3[0].name} (${top3[0].points} pts)`);
    }
  }

  console.log("\n✓ Migration complete");
}

main().catch(console.error);
