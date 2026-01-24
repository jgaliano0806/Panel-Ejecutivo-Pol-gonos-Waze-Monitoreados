import { dbService } from "../database/dbService";
import { logger } from "../utils/logger";
import { eventBus } from "../events";

export interface Notification {
  id: string;
  type: "ACCIDENT" | "HAZARD" | "SYSTEM";
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: Date;
  expires_at: Date;
}

export class NotificationService {
  private static instance: NotificationService;
  private readonly EXPIRATION_HOURS = 1;

  private constructor() {
    this.ensureTable();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async ensureTable() {
    try {
      await dbService.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          data JSONB,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      `);
      logger.info("✅ Notifications table verified");
    } catch (error) {
      logger.error(
        "❌ Error creating notifications table:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async create(
    type: "ACCIDENT" | "HAZARD" | "SYSTEM",
    title: string,
    message: string,
    data: any = {},
  ): Promise<Notification | null> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.EXPIRATION_HOURS);

      const result = await dbService.query<Notification>(
        `INSERT INTO notifications (type, title, message, data, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [type, title, message, data, expiresAt],
      );

      const notification = result.rows[0];

      // Emit real-time event via EventBus (to be picked up by SocketService)
      eventBus.emit("notification:new", notification);

      return notification;
    } catch (error) {
      logger.error(
        "❌ Error creating notification:",
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  public async getRecent(limit: number = 50): Promise<Notification[]> {
    const result = await dbService.query<Notification>(
      `SELECT * FROM notifications
       WHERE expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  public async getAll(
    filters: { type?: string; is_read?: boolean } = {},
    limit: number = 100,
  ): Promise<Notification[]> {
    let query = `SELECT * FROM notifications WHERE 1=1`;
    const params: any[] = [];
    let pIdx = 1;

    if (filters.type) {
      query += ` AND type = $${pIdx++}`;
      params.push(filters.type);
    }

    if (filters.is_read !== undefined) {
      query += ` AND is_read = $${pIdx++}`;
      params.push(filters.is_read);
    }

    query += ` ORDER BY created_at DESC LIMIT $${pIdx}`;
    params.push(limit);

    const result = await dbService.query<Notification>(query, params);
    return result.rows;
  }

  public async markAsRead(id: string): Promise<boolean> {
    const result = await dbService.query(
      `UPDATE notifications SET is_read = true WHERE id = $1`,
      [id],
    );
    return (result.rowCount || 0) > 0;
  }

  public async markAllAsRead(): Promise<void> {
    await dbService.query(
      `UPDATE notifications SET is_read = true WHERE is_read = false`,
    );
  }

  public async cleanupExpired(): Promise<void> {
    await dbService.query(`DELETE FROM notifications WHERE expires_at < NOW()`);
  }
}

export const notificationService = NotificationService.getInstance();
