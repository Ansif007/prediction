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
  stage?: string;
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
  prediction?: string; // Legacy compatibility
}

export type RoundView = "overall" | "round1" | "round2" | "round3" | "knockout";

export interface RoundPointsData {
  id: string;
  uid: string;
  name: string;
  department?: string;
  showOnLeaderboard?: boolean;
  round1: number;
  round2: number;
  round3: number;
  knockout: number;
  overall: number;
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
