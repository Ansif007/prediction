"use client";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  increment,
} from "firebase/firestore";

import { db } from "../../lib/firebase";

interface Match {
  id: string;
  teamA: string;
  teamB: string;
  result?: string;
  status?: string;
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const loadMatches = async () => {
      const snapshot = await getDocs(
        collection(db, "matches")
      );

      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<Match, "id">),
      }));

      setMatches(data);
    };

    loadMatches();
  }, []);

  const saveResult = async (
  matchId: string,
  result: string
) => {
  try {
    const match = matches.find(
      (m) => m.id === matchId
    );

    if (match?.status === "completed") {
      alert("Points already calculated");
      return;
    }

    await updateDoc(
      doc(db, "matches", matchId),
      {
        result,
        status: "completed",
      }
    );

    const predictionsQuery = query(
      collection(db, "predictions"),
      where("matchId", "==", matchId)
    );

    const predictionSnapshot =
      await getDocs(predictionsQuery);

    for (const predictionDoc of predictionSnapshot.docs) {
      const predictionData =
        predictionDoc.data();

      if (
        predictionData.prediction === result
      ) {
        await updateDoc(
          doc(db, "users", predictionData.uid),
          {
            totalPoints: increment(3),
          }
        );
      }
    }

    alert("Result saved and points awarded");
  } catch (error) {
    console.error(error);
  }
};

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Admin Panel
      </h1>

      {matches.map((match) => (
        <div
          key={match.id}
          className="mb-4 rounded border p-4"
        >
          <h2 className="mb-3 text-xl">
            {match.teamA} vs {match.teamB}
          </h2>

          <button
            onClick={() =>
              saveResult(
                match.id,
                match.teamA
              )
            }
            className="mr-2 rounded bg-green-600 px-3 py-2 text-white"
          >
            {match.teamA}
          </button>

          <button
            onClick={() =>
              saveResult(
                match.id,
                match.teamB
              )
            }
            className="mr-2 rounded bg-blue-600 px-3 py-2 text-white"
          >
            {match.teamB}
          </button>

          <button
            onClick={() =>
              saveResult(match.id, "Draw")
            }
            className="rounded bg-orange-600 px-3 py-2 text-white"
          >
            Draw
          </button>
        </div>
      ))}
    </main>
  );
}