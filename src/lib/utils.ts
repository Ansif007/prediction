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
    // Hosts
    "usa": "us", "united states": "us", "mexico": "mx", "canada": "ca",
    
    // South America
    "argentina": "ar", "brazil": "br", "uruguay": "uy", "colombia": "co", "ecuador": "ec", "paraguay": "py", "chile": "cl", "peru": "pe", "venezuela": "ve", "bolivia": "bo",
    
    // Europe
    "france": "fr", "germany": "de", "spain": "es", "england": "gb-eng", "portugal": "pt", "netherlands": "nl", "belgium": "be", "croatia": "hr", "italy": "it", "serbia": "rs", "switzerland": "ch", "denmark": "dk", "poland": "pl", "wales": "gb-wls", "scotland": "gb-sct", "austria": "at", "turkey": "tr", "ukraine": "ua", "sweden": "se", "norway": "no", "czech republic": "cz", "hungary": "hu", "romania": "ro", "georgia": "ge",
    
    // Africa
    "morocco": "ma", "senegal": "sn", "tunisia": "tn", "ghana": "gh", "cameroon": "cm", "nigeria": "ng", "algeria": "dz", "egypt": "eg", "ivory coast": "ci", "mali": "ml", "south africa": "za", "dr congo": "cd",
    
    // Asia
    "japan": "jp", "south korea": "kr", "korea": "kr", "saudi arabia": "sa", "australia": "au", "iran": "ir", "qatar": "qa", "iraq": "iq", "uzbekistan": "uz", "united arab emirates": "ae", "jordan": "jo", "china": "cn", "india": "in", "vietnam": "vn", "thailand": "th", "indonesia": "id",
    
    // North/Central America
    "costa rica": "cr", "panama": "pa", "jamaica": "jm", "honduras": "hn", "el salvador": "sv", "guatemala": "gt", "trinidad and tobago": "tt"
  };
  const code = codes[teamName.toLowerCase()];
  return code ? `https://flagcdn.com/w160/${code}.png` : `https://api.dicebear.com/7.x/identicon/svg?seed=${teamName}&backgroundColor=fef2f2`;
}

export const WORLD_CUP_2026_TEAMS = [
  "USA", "Mexico", "Canada",
  "Argentina", "Brazil", "Uruguay", "Colombia", "Ecuador", "Paraguay", "Chile", "Peru", "Venezuela", "Bolivia",
  "France", "Germany", "Spain", "England", "Portugal", "Netherlands", "Belgium", "Croatia", "Italy", "Serbia", "Switzerland", "Denmark", "Poland", "Wales", "Scotland", "Austria", "Turkey", "Ukraine", "Sweden", "Norway", "Czech Republic", "Hungary", "Romania", "Georgia",
  "Morocco", "Senegal", "Tunisia", "Ghana", "Cameroon", "Nigeria", "Algeria", "Egypt", "Ivory Coast", "Mali", "South Africa", "DR Congo",
  "Japan", "South Korea", "Saudi Arabia", "Australia", "Iran", "Qatar", "Iraq", "Uzbekistan", "United Arab Emirates", "Jordan", "China", "India", "Vietnam", "Thailand", "Indonesia",
  "Costa Rica", "Panama", "Jamaica", "Honduras", "El Salvador", "Guatemala", "Trinidad and Tobago"
].sort();
