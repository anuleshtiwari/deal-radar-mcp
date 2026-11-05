import { exec } from 'child_process';
import { defaultTrackerEngine } from './tracker.js';
import { WatchlistAuditResult } from './tracker.js';

export interface PollingStatus {
  isRunning: boolean;
  intervalMinutes: number;
  lastRun?: string;
  totalChecks: number;
  alertsTriggered: number;
}

export class PriceAlertPoller {
  private timer: NodeJS.Timeout | null = null;
  private intervalMinutes: number = 30;
  private totalChecks: number = 0;
  private alertsTriggered: number = 0;
  private lastRun?: string;

  public start(intervalMinutes: number = 30): PollingStatus {
    if (this.timer) {
      this.stop();
    }

    this.intervalMinutes = Math.max(1, intervalMinutes);
    const ms = this.intervalMinutes * 60 * 1000;

    // Run first poll asynchronously
    this.pollNow().catch(err => {
      console.error('[PricePoller] Error during initial poll:', err.message);
    });

    this.timer = setInterval(() => {
      this.pollNow().catch(err => {
        console.error('[PricePoller] Error during scheduled poll:', err.message);
      });
    }, ms);

    console.log(`[PricePoller] Started polling every ${this.intervalMinutes} minutes.`);
    return this.getStatus();
  }

  public stop(): PollingStatus {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[PricePoller] Stopped polling.');
    }
    return this.getStatus();
  }

  public getStatus(): PollingStatus {
    return {
      isRunning: this.timer !== null,
      intervalMinutes: this.intervalMinutes,
      lastRun: this.lastRun,
      totalChecks: this.totalChecks,
      alertsTriggered: this.alertsTriggered
    };
  }

  public async pollNow(): Promise<WatchlistAuditResult> {
    this.lastRun = new Date().toISOString();
    console.log(`[PricePoller] Checking active alerts at ${this.lastRun}...`);

    const result = await defaultTrackerEngine.checkWatchlist();
    this.totalChecks += result.checkedCount;
    this.alertsTriggered += result.triggeredAlerts.length;

    for (const drop of result.triggeredAlerts) {
      this.sendSystemNotification(
        `🔥 Price Drop Hit: ${drop.alert.title}`,
        `Price is now ${drop.alert.currency} ${drop.currentPrice.toLocaleString()} (Target: ${drop.alert.currency} ${drop.alert.targetPrice.toLocaleString()})`
      );
    }

    return result;
  }

  private sendSystemNotification(title: string, message: string): void {
    if (process.platform === 'linux') {
      exec(`notify-send "${title.replace(/"/g, '\\"')}" "${message.replace(/"/g, '\\"')}" -u critical`, () => {});
    }
  }
}

export const defaultPoller = new PriceAlertPoller();
