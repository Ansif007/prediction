"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function PredictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [match, setMatch] = useState<any>(null);
  const [prediction, setPrediction] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadMatch = async () => {
      const docRef = doc(db, "matches", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMatch(docSnap.data());
      }
    };
    loadMatch();
  }, [id]);

  const handleSubmit = async () => {
    if (!prediction) return alert("Please select a prediction.");

    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    await addDoc(collection(db, "predictions"), {
      matchId: id,
      uid: user.uid,
      prediction,
      createdAt: new Date().toISOString(),
    });

    setSubmitted(true);
  };

  if (!match) return <div>Loading...</div>;

  if (submitted) {
    return (
      <main className="p-8">
        <h2 className="text-2xl font-bold text-green-600">
          Prediction submitted!
        </h2>
        <p className="mt-2">You predicted: {prediction}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        {match.teamA} vs {match.teamB}
      </h1>

      <div className="space-y-3">
        <label className="block">
          <input
            type="radio"
            name="prediction"
            value={match.teamA}
            onChange={(e) => setPrediction(e.target.value)}
          />
          <span className="ml-2">{match.teamA}</span>
        </label>

        <label className="block">
          <input
            type="radio"
            name="prediction"
            value={match.teamB}
            onChange={(e) => setPrediction(e.target.value)}
          />
          <span className="ml-2">{match.teamB}</span>
        </label>

        <label className="block">
          <input
            type="radio"
            name="prediction"
            value="Draw"
            onChange={(e) => setPrediction(e.target.value)}
          />
          <span className="ml-2">Draw</span>
        </label>
      </div>

      <button
        onClick={handleSubmit}
        className="mt-6 rounded bg-green-600 px-4 py-2 text-white"
      >
        Submit Prediction
      </button>
    </main>
  );
}