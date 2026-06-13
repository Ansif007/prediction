"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export function useRequireSetup() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      if (pathname === "/setup") {
        setLoading(false);
        setBlocked(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) {
          router.replace("/");
          return;
        }

        const data = userSnap.data();
        if (data.role === "admin") {
          setBlocked(false);
          setLoading(false);
          return;
        }

        if (!data.employeeId || !data.department) {
          setBlocked(true);
          router.replace("/setup");
          return;
        }

        setBlocked(false);
      } catch {
        router.replace("/");
        return;
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  return { loading, blocked };
}
