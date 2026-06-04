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

  if (!match) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');
          .pulse { animation: pulse 1.5s ease-in-out infinite; }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        `}</style>
        <span className="pulse" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "#f97316", letterSpacing: 4 }}>
          LOADING...
        </span>
      </main>
    );
  }

  if (submitted) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');
          .success-card { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
          @keyframes popIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
        `}</style>
        <div className="success-card" style={{ background: "#12121a", border: "1px solid #22c55e", borderRadius: 24, padding: "48px 40px", textAlign: "center", maxWidth: 400, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: "#22c55e", letterSpacing: 2, margin: "0 0 8px" }}>
            LOCKED IN!
          </h2>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>Your prediction has been submitted</p>
          <div style={{ background: "#1a2a1a", border: "1px solid #22c55e33", borderRadius: 12, padding: "16px 24px" }}>
            <p style={{ color: "#555", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>You predicted</p>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#f1f1f5", letterSpacing: 1, margin: 0 }}>{prediction}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');

        .option-card {
          background: #12121a;
          border: 2px solid #1e1e2e;
          border-radius: 16px;
          padding: 20px 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          animation: fadeUp 0.4s ease both;
        }
        .option-card:hover {
          border-color: #f97316;
          transform: translateX(4px);
        }
        .option-card.selected {
          border-color: #f97316;
          background: #1a1208;
        }
        .option-card:nth-child(1) { animation-delay: 0.1s; }
        .option-card:nth-child(2) { animation-delay: 0.2s; }
        .option-card:nth-child(3) { animation-delay: 0.3s; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .radio-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s;
          flex-shrink: 0;
        }
        .option-card.selected .radio-dot {
          border-color: #f97316;
        }
        .radio-inner {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #f97316;
          transform: scale(0);
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .option-card.selected .radio-inner {
          transform: scale(1);
        }

        .submit-btn {
          width: 100%;
          padding: 16px;
          background: #f97316;
          color: #fff;
          border: none;
          border-radius: 14px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 2px;
          cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
          margin-top: 24px;
        }
        .submit-btn:hover {
          background: #ea6b0a;
          box-shadow: 0 0 30px rgba(249,115,22,0.4);
          transform: translateY(-1px);
        }
        .submit-btn:disabled {
          background: #2a2a2a;
          color: #444;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e1e2e", padding: "20px 40px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 10px #f97316" }} />
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#f1f1f5", letterSpacing: 2 }}>
          PREDICTIFY
        </span>
      </div>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "48px 24px" }}>
        {/* Match title */}
        <div style={{ marginBottom: 40, animation: "fadeUp 0.4s ease both" }}>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: 4, color: "#f97316", textTransform: "uppercase", margin: "0 0 12px" }}>
            Make your prediction
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: "#f1f1f5", letterSpacing: 2, margin: 0 }}>
              {match.teamA}
            </h1>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#333", letterSpacing: 2 }}>VS</span>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: "#f1f1f5", letterSpacing: 2, margin: 0 }}>
              {match.teamB}
            </h1>
          </div>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[match.teamA, match.teamB, "Draw"].map((option) => (
            <div
              key={option}
              className={`option-card${prediction === option ? " selected" : ""}`}
              onClick={() => setPrediction(option)}
            >
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: prediction === option ? "#f1f1f5" : "#888", letterSpacing: 1, transition: "color 0.2s" }}>
                {option}
              </span>
              <div className="radio-dot">
                <div className="radio-inner" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!prediction}
          className="submit-btn"
        >
          Submit Prediction →
        </button>
      </div>
    </main>
  );
}