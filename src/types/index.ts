import { Timestamp } from "firebase/firestore";

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: Timestamp | Date | string;
  status: string;
  result: string | null;
  totalGoalsResult?: string;
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
  prediction?: string; // Legacy compatibility
}

export interface DeptData {
  name: string;
  totalPoints: number;
  userCount: number;
  averagePoints: number;
}
