"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function useRequireSetup() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData, loading } = useAuth();

  const needsSetup =
    !!user && !!userData && userData.role !== "admin" && (!userData.employeeId || !userData.department);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (pathname === "/setup") return;

    if (!userData) {
      router.replace("/");
      return;
    }

    if (userData.role === "admin") return;

    if (!userData.employeeId || !userData.department) {
      router.replace("/setup");
      return;
    }
  }, [user, userData, loading, router, pathname]);

  return { loading: loading || (!userData && !!user), blocked: needsSetup };
}
