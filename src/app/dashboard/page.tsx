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

function formatKickoff(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "matches"));
        const matchList: Match[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Match, "id">),
        }));
        setMatches(matchList);
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        fontFamily: "'DM Sans', sans-serif",
        padding: "0",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Bebas+Neue&display=swap');

        .match-card {
          background: #12121a;
          border: 1px solid #1e1e2e;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          transition: border-color 0.2s, transform 0.2s;
          animation: fadeUp 0.4s ease both;
        }
        .match-card:hover {
          border-color: #f97316;
          transform: translateY(-2px);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .match-card:nth-child(1) { animation-delay: 0.05s; }
        .match-card:nth-child(2) { animation-delay: 0.10s; }
        .match-card:nth-child(3) { animation-delay: 0.15s; }
        .match-card:nth-child(4) { animation-delay: 0.20s; }

        .teams {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
        }
        .team-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          color: #f1f1f5;
          letter-spacing: 1px;
        }
        .vs-badge {
          background: #1e1e2e;
          color: #555570;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 200px;
        }
        .kickoff {
          font-size: 13px;
          color: #888;
        }
        .kickoff span {
          color: #aaa;
          font-weight: 500;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #22c55e;
        }
        .status-pill::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          display: inline-block;
          box-shadow: 0 0 6px #22c55e;
        }
        .predict-btn {
          background: #f97316;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.3px;
          padding: 10px 22px;
          border-radius: 10px;
          border: none;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 0 0 #f97316;
        }
        .predict-btn:hover {
          background: #ea6b0a;
          box-shadow: 0 0 20px rgba(249,115,22,0.4);
        }
        .skeleton {
          background: linear-gradient(90deg, #12121a 25%, #1a1a26 50%, #12121a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 16px;
          height: 88px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 600px) {
          .match-card { flex-direction: column; align-items: flex-start; }
          .meta { min-width: unset; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1e1e2e",
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#f97316",
            boxShadow: "0 0 10px #f97316",
          }}
        />
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            color: "#f1f1f5",
            letterSpacing: 2,
          }}
        >
          PREDICTIFY
        </span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 36 }}>
          <p
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 11,
              letterSpacing: 4,
              color: "#f97316",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Live &amp; Upcoming
          </p>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 52,
              color: "#f1f1f5",
              letterSpacing: 2,
              lineHeight: 1,
              margin: 0,
            }}
          >
            MATCHES
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <>
              <div className="skeleton" />
              <div className="skeleton" style={{ animationDelay: "0.2s" }} />
              <div className="skeleton" style={{ animationDelay: "0.4s" }} />
            </>
          ) : matches.length === 0 ? (
            <p style={{ color: "#555", textAlign: "center", padding: "48px 0" }}>
              No upcoming matches found.
            </p>
          ) : (
            matches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="teams">
                  <span className="team-name">{match.teamA}</span>
                  <span className="vs-badge">VS</span>
                  <span className="team-name">{match.teamB}</span>
                </div>

                <div className="meta">
                  <div className="kickoff">
                    <span>{formatKickoff(match.kickoffTime)}</span>
                  </div>
                  <div className="status-pill">{match.status}</div>
                </div>

                <Link href={`/predict/${match.id}`} className="predict-btn">
                  Predict →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}