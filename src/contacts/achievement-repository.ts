/**
 * Achievement Repository
 *
 * Data access layer for gamification achievement operations.
 * Manages achievement tracking and network health scores.
 * 
 * Requirements: 8.3, 8.4, 8.5
 */

import pool from '../db/connection';

/**
 * Achievement types
 */
export type AchievementType =
  | 'first_contact_categorized'
  | 'inner_circle_complete'
  | 'all_contacts_categorized'
  | 'week_streak_3'
  | 'week_streak_10'
  | 'balanced_network'
  | 'network_health_excellent';

/**
 * Achievement record from database
 */
export interface AchievementRecord {
  id: string;
  userId: string;
  achievementType: AchievementType;
  achievementData?: any;
  earnedAt: Date;
}

/**
 * Data for creating achievement
 */
export interface AchievementCreateData {
  userId: string;
  achievementType: AchievementType;
  achievementData?: any;
}

/**
 * Network health score record from database
 */
export interface NetworkHealthScoreRecord {
  id: string;
  userId: string;
  score: number;
  circleBalanceScore?: number;
  engagementScore?: number;
  maintenanceScore?: number;
  calculatedAt: Date;
}

/**
 * Data for creating network health score
 */
export interface NetworkHealthScoreCreateData {
  userId: string;
  score: number;
  circleBalanceScore?: number;
  engagementScore?: number;
  maintenanceScore?: number;
}

/**
 * Achievement Repository Interface
 */
export interface AchievementRepository {
  createAchievement(data: AchievementCreateData): Promise<AchievementRecord>;
  findAchievementsByUserId(userId: string): Promise<AchievementRecord[]>;
  hasAchievement(userId: string, achievementType: AchievementType): Promise<boolean>;
  getAchievementCount(userId: string): Promise<number>;
  
  createNetworkHealthScore(data: NetworkHealthScoreCreateData): Promise<NetworkHealthScoreRecord>;
  getLatestNetworkHealthScore(userId: string): Promise<NetworkHealthScoreRecord | null>;
  getNetworkHealthHistory(userId: string, limit: number): Promise<NetworkHealthScoreRecord[]>;
}

/**
 * PostgreSQL Achievement Repository Implementation
 */
export class PostgresAchievementRepository implements AchievementRepository {
  /**
   * Create new achievement
   * Requirements: 8.3
   */
  async createAchievement(data: AchievementCreateData): Promise<AchievementRecord> {
    // Check if achievement already exists
    const existing = await this.hasAchievement(data.userId, data.achievementType);
    if (existing) {
      // Return existing achievement instead of creating duplicate
      const result = await pool.query(
        `SELECT * FROM onboarding_achievements
         WHERE user_id = $1 AND achievement_type = $2
         ORDER BY earned_at DESC
         LIMIT 1`,
        [data.userId, data.achievementType]
      );
      return this.mapRowToAchievement(result.rows[0]);
    }

    const result = await pool.query(
      `INSERT INTO onboarding_achievements (
        user_id, achievement_type, achievement_data
      ) VALUES ($1, $2, $3)
      RETURNING *`,
      [
        data.userId,
        data.achievementType,
        data.achievementData ? JSON.stringify(data.achievementData) : null,
      ]
    );

    return this.mapRowToAchievement(result.rows[0]);
  }

  /**
   * Find all achievements for a user
   * Requirements: 8.3
   */
  async findAchievementsByUserId(userId: string): Promise<AchievementRecord[]> {
    const result = await pool.query(
      `SELECT * FROM onboarding_achievements
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToAchievement(row));
  }

  /**
   * Check if user has a specific achievement
   * Requirements: 8.3
   */
  async hasAchievement(userId: string, achievementType: AchievementType): Promise<boolean> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM onboarding_achievements
       WHERE user_id = $1 AND achievement_type = $2`,
      [userId, achievementType]
    );

    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Get total achievement count for a user
   * Requirements: 8.3
   */
  async getAchievementCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM onboarding_achievements
       WHERE user_id = $1`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Create new network health score
   * Requirements: 8.5
   */
  async createNetworkHealthScore(data: NetworkHealthScoreCreateData): Promise<NetworkHealthScoreRecord> {
    const result = await pool.query(
      `INSERT INTO network_health_scores (
        user_id, score, circle_balance_score, 
        engagement_score, maintenance_score
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        data.userId,
        data.score,
        data.circleBalanceScore || null,
        data.engagementScore || null,
        data.maintenanceScore || null,
      ]
    );

    return this.mapRowToNetworkHealthScore(result.rows[0]);
  }

  /**
   * Get latest network health score for a user
   * Requirements: 8.5
   */
  async getLatestNetworkHealthScore(userId: string): Promise<NetworkHealthScoreRecord | null> {
    const result = await pool.query(
      `SELECT * FROM network_health_scores
       WHERE user_id = $1
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNetworkHealthScore(result.rows[0]);
  }

  /**
   * Get network health score history
   * Requirements: 8.5
   */
  async getNetworkHealthHistory(userId: string, limit: number = 30): Promise<NetworkHealthScoreRecord[]> {
    const result = await pool.query(
      `SELECT * FROM network_health_scores
       WHERE user_id = $1
       ORDER BY calculated_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => this.mapRowToNetworkHealthScore(row));
  }

  /**
   * Map database row to AchievementRecord
   */
  private mapRowToAchievement(row: any): AchievementRecord {
    return {
      id: row.id,
      userId: row.user_id,
      achievementType: row.achievement_type as AchievementType,
      achievementData: row.achievement_data || undefined,
      earnedAt: new Date(row.earned_at),
    };
  }

  /**
   * Map database row to NetworkHealthScoreRecord
   */
  private mapRowToNetworkHealthScore(row: any): NetworkHealthScoreRecord {
    return {
      id: row.id,
      userId: row.user_id,
      score: row.score,
      circleBalanceScore: row.circle_balance_score || undefined,
      engagementScore: row.engagement_score || undefined,
      maintenanceScore: row.maintenance_score || undefined,
      calculatedAt: new Date(row.calculated_at),
    };
  }
}

// Default instance for backward compatibility
const defaultRepository = new PostgresAchievementRepository();

export const createAchievement = (data: AchievementCreateData) => defaultRepository.createAchievement(data);
export const findAchievementsByUserId = (userId: string) => defaultRepository.findAchievementsByUserId(userId);
export const hasAchievement = (userId: string, achievementType: AchievementType) => defaultRepository.hasAchievement(userId, achievementType);
export const getAchievementCount = (userId: string) => defaultRepository.getAchievementCount(userId);

export const createNetworkHealthScore = (data: NetworkHealthScoreCreateData) => defaultRepository.createNetworkHealthScore(data);
export const getLatestNetworkHealthScore = (userId: string) => defaultRepository.getLatestNetworkHealthScore(userId);
export const getNetworkHealthHistory = (userId: string, limit?: number) => defaultRepository.getNetworkHealthHistory(userId, limit);
