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
