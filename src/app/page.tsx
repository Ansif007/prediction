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
        console.log("Login successful");
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
      console.error("Message:", error.message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      {!user ? (
        <button
          onClick={login}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome {user.displayName}</h1>
          <p>{user.email}</p>
          <button
            onClick={logout}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>
      )}
    </main>
  );
}