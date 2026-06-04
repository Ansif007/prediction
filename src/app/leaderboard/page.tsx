"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

interface UserData {
  id: string;
  name: string;
  totalPoints: number;
}

export default function Leaderboard() {
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const q = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc")
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<UserData, "id">),
      }));

      setUsers(data);
    };

    loadLeaderboard();
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Leaderboard
      </h1>

      <div className="space-y-4">
        {users.map((user, index) => (
          <div
            key={user.id}
            className="rounded border p-4"
          >
            <h2 className="text-xl font-bold">
              #{index + 1} {user.name}
            </h2>

            <p>
              Points: {user.totalPoints}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}