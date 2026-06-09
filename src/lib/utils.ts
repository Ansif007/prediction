import { Timestamp } from "firebase/firestore";

/**
 * Formats a Firestore Timestamp or Date/string into a readable kickoff string.
 */
export function formatKickoff(time: Timestamp | Date | string | undefined | null) {
  if (!time) return "";
  try {
    const d = time instanceof Timestamp ? time.toDate() : new Date(time as string | number | Date);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return time?.toString() || "";
  }
}

/**
 * Returns the flag URL for a given country name.
 * Uses flagcdn.com for high-quality SVG flags.
 */
export function getTeamFlag(teamName: string) {
  const codes: Record<string, string> = {
    "argentina": "ar", "brazil": "br", "france": "fr", "germany": "de", "spain": "es",
    "england": "gb-eng", "portugal": "pt", "netherlands": "nl", "belgium": "be", "croatia": "hr",
    "morocco": "ma", "japan": "jp", "south korea": "kr", "korea": "kr", "usa": "us", "united states": "us",
    "mexico": "mx", "saudi arabia": "sa", "australia": "au", "senegal": "sn", "poland": "pl",
    "switzerland": "ch", "denmark": "dk", "tunisia": "tn", "canada": "ca", "wales": "gb-wls",
    "qatar": "qa", "ecuador": "ec", "iran": "ir", "ghana": "gh", "cameroon": "cm", "serbia": "rs",
    "costa rica": "cr", "uruguay": "uy", "italy": "it", "india": "in"
  };
  const code = codes[teamName.toLowerCase()];
  return code ? `https://flagcdn.com/w160/${code}.png` : `https://api.dicebear.com/7.x/identicon/svg?seed=${teamName}&backgroundColor=fef2f2`;
}
