import { Timestamp } from "firebase/firestore";

export const DEPARTMENT_OTHER = "others";
const DEPARTMENT_OTHER_LEGACY = "OTHER (SAFETY, SECURITY, HR)";

/** Normalizes department for grouping; maps legacy value to "others". */
export function normalizeDepartment(department?: string | null): string {
  if (!department || department === DEPARTMENT_OTHER_LEGACY) {
    return DEPARTMENT_OTHER;
  }
  return department;
}

/** Formats department for display across the app. */
export function formatDepartmentDisplay(department?: string | null): string {
  if (!department) return "";
  return normalizeDepartment(department);
}

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
  const normalized = teamName
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");

  const codes: Record<string, string> = {
    // Hosts
    "usa": "us", "united states": "us", "mexico": "mx", "canada": "ca",
    
    // South America
    "argentina": "ar", "brazil": "br", "uruguay": "uy", "colombia": "co", "ecuador": "ec", "paraguay": "py", "chile": "cl", "peru": "pe", "venezuela": "ve", "bolivia": "bo",
    
    // Europe
    "france": "fr", "germany": "de", "spain": "es", "england": "gb-eng", "portugal": "pt", "netherlands": "nl", "belgium": "be", "croatia": "hr", "italy": "it", "serbia": "rs", "switzerland": "ch", "denmark": "dk", "poland": "pl", "wales": "gb-wls", "scotland": "gb-sct", "austria": "at", "turkey": "tr", "ukraine": "ua", "sweden": "se", "norway": "no", "czech republic": "cz", "hungary": "hu", "romania": "ro", "georgia": "ge", "bosnia and herzegovina": "ba", "bosnia herzegovina": "ba",
    
    // Africa
    "morocco": "ma", "senegal": "sn", "tunisia": "tn", "ghana": "gh", "cameroon": "cm", "nigeria": "ng", "algeria": "dz", "egypt": "eg", "ivory coast": "ci", "mali": "ml", "south africa": "za", "dr congo": "cd",
    
    // Asia
    "japan": "jp", "south korea": "kr", "korea": "kr", "saudi arabia": "sa", "australia": "au", "iran": "ir", "qatar": "qa", "iraq": "iq", "uzbekistan": "uz", "united arab emirates": "ae", "jordan": "jo", "china": "cn", "india": "in", "vietnam": "vn", "thailand": "th", "indonesia": "id",
    
    // North/Central America
    "panama": "pa", "haiti": "ht", "curacao": "cw",

    // Oceania
    "new zealand": "nz",

    // Africa - additional
    "cabo verde": "cv",
  };
  const code = codes[normalized];
  return code ? `https://flagcdn.com/w160/${code}.png` : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(teamName)}&backgroundColor=fef2f2`;
}

export const ROUND_RANGES: Record<string, [number, number] | null> = {
  overall: null,
  round1: [1, 24],
  round2: [25, 48],
  round3: [49, 72],
  knockout: [73, 104],
};

export const ROUND_LABELS: Record<string, string> = {
  overall: "Overall",
  round1: "Round 1",
  round2: "Round 2",
  round3: "Round 3",
  knockout: "Knockout",
};

export function roundKeyFromMatchNumber(mn: number): "round1" | "round2" | "round3" | "knockout" {
  if (mn <= 24) return "round1";
  if (mn <= 48) return "round2";
  if (mn <= 72) return "round3";
  return "knockout";
}

export const STAGE_POINTS: Record<string, { winnerPoints: number; goalsPoints: number }> = {
  "Group Stage": { winnerPoints: 2, goalsPoints: 1 },
  "Round of 32": { winnerPoints: 2, goalsPoints: 1 },
  "Round of 16": { winnerPoints: 3, goalsPoints: 1 },
  "Quarter-Finals": { winnerPoints: 4, goalsPoints: 2 },
  "Semi-Finals": { winnerPoints: 5, goalsPoints: 2 },
  "Third Place": { winnerPoints: 5, goalsPoints: 2 },
  "Final": { winnerPoints: 6, goalsPoints: 2 },
};

export function getStageFromMatchNumber(mn: number): string {
  if (mn >= 1 && mn <= 72) return "Group Stage";
  if (mn >= 73 && mn <= 88) return "Round of 32";
  if (mn >= 89 && mn <= 96) return "Round of 16";
  if (mn >= 97 && mn <= 100) return "Quarter-Finals";
  if (mn >= 101 && mn <= 102) return "Semi-Finals";
  if (mn === 103) return "Third Place";
  if (mn === 104) return "Final";
  return "Group Stage";
}

export const WORLD_CUP_2026_TEAMS = [
  "USA", "Mexico", "Canada",
  "Argentina", "Brazil", "Colombia", "Ecuador", "Paraguay", "Uruguay",
  "France", "Germany", "Spain", "England", "Portugal", "Netherlands", "Belgium", "Croatia",
  "Switzerland", "Austria", "Turkey", "Sweden", "Norway", "Czech Republic",
  "Scotland", "Bosnia and Herzegovina",
  "Morocco", "Senegal", "Tunisia", "Ghana", "Algeria", "Egypt", "Ivory Coast", "South Africa",
  "DR Congo", "Cabo Verde",
  "Japan", "South Korea", "Saudi Arabia", "Australia", "Iran", "Qatar", "Iraq",
  "Uzbekistan", "Jordan",
  "Panama", "Haiti", "Curaçao",
  "New Zealand",
].sort();
