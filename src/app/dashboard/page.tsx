"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Link from "next/link";

interface Match {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: string;
  status: string;
  result: string | null;
}

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const querySnapshot = await getDocs(
          collection(db, "matches")
        );

        const matchList: Match[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Match, "id">),
        }));

        setMatches(matchList);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    fetchMatches();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Upcoming Matches
      </h1>

      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="rounded-lg border p-4 shadow"
          >
            <h2 className="text-xl font-semibold">
              {match.teamA} vs {match.teamB}
            </h2>

            <p>
              Kickoff: {match.kickoffTime}
            </p>

            <p>Status: {match.status}</p>

            <Link
                    href={`/predict/${match.id}`}
                    className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-white"
                    >
                Predict
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}