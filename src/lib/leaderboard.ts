import { UserData, Match, Prediction, LeaderboardEntry, DeptData } from "@/types";
import { ROUNDS, normalizeDepartment } from "./utils";

export type LeaderboardScope = "overall" | "department" | "round";

export interface ComputeOptions {
  scope: LeaderboardScope;
  roundId?: string;
  matches?: Match[];
  predictions?: Prediction[];
}

export function computeLeaderboard(users: UserData[], options: ComputeOptions): LeaderboardEntry[] {
  switch (options.scope) {
    case "overall":
      return computeOverall(users);
    case "round":
      return computeRound(users, options.roundId || "", options.matches || [], options.predictions || []);
    default:
      return [];
  }
}

function computeOverall(users: UserData[]): LeaderboardEntry[] {
  return users
    .filter((u) => u.role !== "admin" && u.showOnLeaderboard !== false)
    .map((u) => ({
      rank: 0,
      userId: u.id || u.uid,
      name: u.name || "",
      department: u.department,
      points: u.totalPoints || 0,
      winnerHits: 0,
      exactScoreHits: 0,
    }))
    .sort((a, b) => {
      const pts = b.points - a.points;
      if (pts !== 0) return pts;
      return a.name.localeCompare(b.name);
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

function computeRound(users: UserData[], roundId: string, matches: Match[], predictions: Prediction[]): LeaderboardEntry[] {
  const round = ROUNDS.find((r) => r.id === roundId);
  if (!round) return [];

  const matchRoundMap = new Map<string, number>();
  matches.forEach((m) => {
    if (m.matchNumber && m.id) {
      matchRoundMap.set(m.id, m.matchNumber);
    }
  });

  const roundPredictions = predictions.filter((p) => {
    if (!p.pointsAwarded) return false;
    const mn = matchRoundMap.get(p.matchId);
    return mn !== undefined && mn >= round.startMatch && mn <= round.endMatch;
  });

  const userPoints = new Map<string, { points: number; winnerHits: number; exactScoreHits: number }>();

  roundPredictions.forEach((p) => {
    const current = userPoints.get(p.uid) || { points: 0, winnerHits: 0, exactScoreHits: 0 };
    current.points += p.pointsEarned || 0;
    if (p.winnerHit) current.winnerHits++;
    if (p.goalsHit) current.exactScoreHits++;
    userPoints.set(p.uid, current);
  });

  return users
    .filter((u) => u.role !== "admin")
    .map((u) => {
      const stats = userPoints.get(u.id || u.uid) || { points: 0, winnerHits: 0, exactScoreHits: 0 };
      return {
        rank: 0,
        userId: u.id || u.uid,
        name: u.name || "",
        department: u.department,
        points: stats.points,
        winnerHits: stats.winnerHits,
        exactScoreHits: stats.exactScoreHits,
      };
    })
    .filter((e) => e.points > 0 || e.winnerHits > 0 || e.exactScoreHits > 0)
    .sort((a, b) => {
      const pts = b.points - a.points;
      if (pts !== 0) return pts;
      return a.name.localeCompare(b.name);
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export function computeDepartmentRankings(users: UserData[]): DeptData[] {
  const deptMap: Record<string, { totalPoints: number; userCount: number }> = {};
  users
    .filter((u) => u.role !== "admin")
    .forEach((u) => {
      const dept = normalizeDepartment(u.department);
      if (!deptMap[dept]) {
        deptMap[dept] = { totalPoints: 0, userCount: 0 };
      }
      deptMap[dept].totalPoints += u.totalPoints || 0;
      deptMap[dept].userCount += 1;
    });

  return Object.entries(deptMap)
    .map(([name, stats]) => ({
      name,
      totalPoints: stats.totalPoints,
      userCount: stats.userCount,
      averagePoints: stats.userCount > 0 ? Number((stats.totalPoints / stats.userCount).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export function getRoundTopThree(entries: LeaderboardEntry[]): {
  first: LeaderboardEntry | null;
  second: LeaderboardEntry | null;
  third: LeaderboardEntry | null;
} {
  return {
    first: entries[0] || null,
    second: entries[1] || null,
    third: entries[2] || null,
  };
}

export function getUserRoundRank(entries: LeaderboardEntry[], userId: string): number {
  const idx = entries.findIndex((e) => e.userId === userId);
  return idx !== -1 ? idx + 1 : 0;
}

export function getUserRoundPoints(entries: LeaderboardEntry[], userId: string): number {
  const entry = entries.find((e) => e.userId === userId);
  return entry?.points || 0;
}
