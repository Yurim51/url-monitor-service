const cron = require('node-cron');

class MonitorScheduler {
    constructor(urlMonitor, database) {
        this.monitor = urlMonitor;
        this.db = database;
        this.jobs = new Map(); // monitorId -> cron job
    }

    start() {
        console.log('🚀 Starting monitor scheduler...');

        // Load all active monitors and schedule them
        const monitors = this.db.getAllMonitors();

        for (const monitor of monitors) {
            this.scheduleMonitor(monitor.id, monitor.interval);
        }

        console.log(`✓ Scheduled ${monitors.length} monitor(s)`);
    }

    scheduleMonitor(monitorId, interval) {
        // Stop existing job if any
        this.stopMonitor(monitorId);

        // Convert interval to cron expression
        const cronExpression = this.getCronExpression(interval);

        if (!cronExpression) {
            console.error(`Invalid interval: ${interval}`);
            return;
        }

        // Create and start cron job
        const job = cron.schedule(cronExpression, async () => {
            console.log(`\n⏰ Scheduled check triggered for monitor #${monitorId}`);
            await this.monitor.checkMonitor(monitorId);
        });

        this.jobs.set(monitorId, job);
        console.log(`✓ Scheduled monitor #${monitorId} with interval: ${interval} (${cronExpression})`);
    }

    stopMonitor(monitorId) {
        const job = this.jobs.get(monitorId);
        if (job) {
            job.stop();
            this.jobs.delete(monitorId);
            console.log(`✓ Stopped monitor #${monitorId}`);
        }
    }

    getCronExpression(interval) {
        const expressions = {
            'hourly': '0 * * * *',        // Every hour at minute 0
            'daily': '0 9 * * *',         // Every day at 9:00 AM
            'weekly': '0 9 * * 1',        // Every Monday at 9:00 AM
            'every-5-min': '*/5 * * * *'  // Every 5 minutes (for testing)
        };

        return expressions[interval.toLowerCase()];
    }

    stopAll() {
        console.log('🛑 Stopping all scheduled monitors...');
        for (const [monitorId, job] of this.jobs.entries()) {
            job.stop();
            console.log(`✓ Stopped monitor #${monitorId}`);
        }
        this.jobs.clear();
    }

    getActiveJobs() {
        return Array.from(this.jobs.keys());
    }
}

module.exports = MonitorScheduler;
