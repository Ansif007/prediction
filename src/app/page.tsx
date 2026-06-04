"use client";

import { useState } from "react";
import { signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../lib/firebase";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  const login = () => {
    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        const loggedInUser = result.user;
        const userRef = doc(db, "users", loggedInUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: loggedInUser.uid,
            name: loggedInUser.displayName || "",
            email: loggedInUser.email || "",
            role: "user",
            totalPoints: 0,
            createdAt: new Date().toISOString(),
          });
        }
        setUser(loggedInUser);
      })
      .catch((error: any) => {
        console.error("Login Error:", error.code);
        console.error("Message:", error.message);
      });
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error: any) {
      console.error("Logout Error:", error.code);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Bebas+Neue&display=swap');

        .card {
          background: #12121a;
          border: 1px solid #1e1e2e;
          border-radius: 24px;
          padding: 48px 40px;
          width: 100%;
          max-width: 400px;
          text-align: center;
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 14px 20px;
          background: #fff;
          color: #111;
          border: none;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s;
          margin-top: 32px;
        }
        .google-btn:hover {
          background: #f1f1f1;
          box-shadow: 0 4px 20px rgba(255,255,255,0.1);
        }
        .logout-btn {
          margin-top: 20px;
          padding: 10px 24px;
          background: transparent;
          color: #f97316;
          border: 1px solid #f97316;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .logout-btn:hover {
          background: rgba(249,115,22,0.1);
        }
        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2px solid #f97316;
          margin: 0 auto 16px;
          display: block;
        }
      `}</style>

      <div className="card">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 10px #f97316" }} />
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#f1f1f5", letterSpacing: 3 }}>
            PREDICTIFY
          </span>
        </div>

        {!user ? (
          <>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: "#f1f1f5", letterSpacing: 2, margin: "0 0 8px" }}>
              PLACE YOUR BET
            </h1>
            <p style={{ color: "#555", fontSize: 14, margin: 0 }}>
              Sign in to predict match outcomes and earn points
            </p>
            <button onClick={login} className="google-btn">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36.5 24 36.5c-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.7 39.8 16.4 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.8l6.2 5.2C41.1 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
              </svg>
              Sign in with Google
            </button>
          </>
        ) : (
          <>
            {user.photoURL && <img src={user.photoURL} alt="avatar" className="avatar" />}
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#f1f1f5", letterSpacing: 2, margin: "0 0 4px" }}>
              {user.displayName}
            </h1>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 0 }}>{user.email}</p>
            <button onClick={logout} className="logout-btn">Sign Out</button>
          </>
        )}
      </div>
    </main>
  );
}