import prisma from "../lib/prisma.js";

// Event types for analytics
export type AnalyticsEventType =
  | "app_opened"
  | "contact_created"
  | "contact_deleted"
  | "contact_contacted"
  | "contact_snoozed"
  | "voice_to_contact_used"
  | "ai_suggestions_requested"
  | "reminder_sent"
  | "reminder_clicked";

interface TrackEventOptions {
  userId?: number;
  event: AnalyticsEventType;
  metadata?: Record<string, string | number | boolean | null>;
}

class AnalyticsService {
  /**
   * Track an analytics event
   */
  async track({ userId, event, metadata }: TrackEventOptions): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId,
          event,
          metadata: metadata ?? undefined,
        },
      });
    } catch (error) {
      // Don't throw - analytics should never break the app
      console.error("Failed to track event:", error);
    }
  }

  /**
   * Get active users count for a time period
   */
  async getActiveUsers(since: Date): Promise<number> {
    const result = await prisma.analyticsEvent.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: since },
        userId: { not: null },
      },
    });
    return result.length;
  }

  /**
   * Get event counts grouped by event type
   */
  async getEventCounts(since: Date): Promise<Record<string, number>> {
    const result = await prisma.analyticsEvent.groupBy({
      by: ["event"],
      where: {
        createdAt: { gte: since },
      },
      _count: true,
    });

    return result.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.event] = item._count;
        return acc;
      },
      {}
    );
  }

  /**
   * Get daily active users for the last N days
   */
  async getDailyActiveUsers(days: number = 7): Promise<{ date: string; count: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: since },
        userId: { not: null },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    });

    // Group by date and count unique users
    const dailyUsers = new Map<string, Set<number>>();

    for (const event of events) {
      const date = event.createdAt.toISOString().split("T")[0];
      if (!dailyUsers.has(date)) {
        dailyUsers.set(date, new Set());
      }
      if (event.userId) {
        dailyUsers.get(date)!.add(event.userId);
      }
    }

    return Array.from(dailyUsers.entries())
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get summary stats for dashboard
   */
  async getSummary() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [dauToday, dauWeek, dauMonth, eventCounts, totalUsers] = await Promise.all([
      this.getActiveUsers(today),
      this.getActiveUsers(weekAgo),
      this.getActiveUsers(monthAgo),
      this.getEventCounts(monthAgo),
      prisma.user.count(),
    ]);

    return {
      activeUsers: {
        today: dauToday,
        week: dauWeek,
        month: dauMonth,
      },
      totalUsers,
      events: eventCounts,
    };
  }
}

export const analyticsService = new AnalyticsService();
