import { Timestamp } from "firebase/firestore";

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: Timestamp | Date | string;
  status: string;
  result: string | null;
  totalGoalsResult?: string;
  matchNumber?: number;
  stats?: {
    teamA: number;
    draw: number;
    teamB: number;
    total: number;
  };
}

export interface UserData {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: "user" | "admin";
  totalPoints: number;
  department?: string;
  employeeId?: string;
  profileSetup?: boolean;
  showOnLeaderboard?: boolean;
  createdAt?: string;
}

export interface Prediction {
  id: string;
  matchId: string;
  uid: string;
  userName?: string;
  winnerPrediction: string;
  goalsPrediction: string;
  createdAt: string;
  updatedAt?: Timestamp;
  pointsAwarded?: boolean;
  pointsEarned?: number;
  winnerHit?: boolean;
  goalsHit?: boolean;
  roundId?: string;
  prediction?: string; // Legacy compatibility
}

export interface DeptData {
  name: string;
  totalPoints: number;
  userCount: number;
  averagePoints: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  type: 'info' | 'alert' | 'update';
}

export interface AppSettings {
  isLeaderboardEnabled: boolean;
}

export interface LeaderboardPeriod {
  id: string;
  name: string;
  startMatch: number;
  endMatch: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  department?: string;
  points: number;
  winnerHits: number;
  exactScoreHits: number;
}

export interface RoundResult {
  roundId: string;
  rankings: LeaderboardEntry[];
  generatedAt: string;
}

export interface RoundWinner {
  roundId: string;
  firstPlaceUserId: string;
  firstPlaceName: string;
  firstPlacePoints: number;
  secondPlaceUserId: string;
  secondPlaceName: string;
  secondPlacePoints: number;
  thirdPlaceUserId: string;
  thirdPlaceName: string;
  thirdPlacePoints: number;
  generatedAt: string;
}
