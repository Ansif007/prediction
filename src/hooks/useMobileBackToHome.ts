"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HOME_PATH = "/";

export function useMobileBackToHome() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.history.pushState({ backToHome: true }, "");

    const handlePopState = () => {
      window.history.pushState({ backToHome: true }, "");
      router.replace(HOME_PATH);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);
}
