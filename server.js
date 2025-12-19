const express = require('express');
const path = require('path');
const MonitorDatabase = require('./database');
const URLMonitor = require('./monitor');
const MonitorScheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and monitor
const db = new MonitorDatabase();
let urlMonitor;
let scheduler;


// Wait for database to initialize
async function startServer() {
    await db.initPromise;

    urlMonitor = new URLMonitor(db);
    scheduler = new MonitorScheduler(urlMonitor, db);

    // Middleware
    app.use(express.json());
    app.use(express.static('public'));

    // API Routes

    // Get all monitors
    app.get('/api/monitors', (req, res) => {
        try {
            const monitors = db.getAllMonitors();
            res.json({ success: true, monitors });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get single monitor
    app.get('/api/monitors/:id', (req, res) => {
        try {
            const monitor = db.getMonitor(req.params.id);
            if (!monitor) {
                return res.status(404).json({ success: false, error: 'Monitor not found' });
            }

            const posts = db.getPostsByMonitor(req.params.id);
            res.json({ success: true, monitor, posts });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Create new monitor
    app.post('/api/monitors', (req, res) => {
        try {
            const { url, interval, slackWebhook } = req.body;

            if (!url || !interval) {
                return res.status(400).json({
                    success: false,
                    error: 'URL and interval are required'
                });
            }

            // Use default webhook if not provided
            const webhook = slackWebhook || 'console';

            const monitorId = db.addMonitor(url, interval, webhook);

            // Schedule the monitor
            scheduler.scheduleMonitor(monitorId, interval);

            // Run initial check
            urlMonitor.checkMonitor(monitorId).then(result => {
                console.log(`Initial check completed for monitor #${monitorId}:`, result);
            });

            res.json({
                success: true,
                monitorId,
                message: 'Monitor created and scheduled successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Delete monitor
    app.delete('/api/monitors/:id', (req, res) => {
        try {
            const monitorId = parseInt(req.params.id);

            // Stop scheduled job
            scheduler.stopMonitor(monitorId);

            // Delete from database
            db.deleteMonitor(monitorId);

            res.json({
                success: true,
                message: 'Monitor deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Manually trigger check for a monitor
    app.post('/api/monitors/:id/check', async (req, res) => {
        try {
            const monitorId = parseInt(req.params.id);
            const result = await urlMonitor.checkMonitor(monitorId);

            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get posts for a monitor
    app.get('/api/monitors/:id/posts', (req, res) => {
        try {
            const posts = db.getPostsByMonitor(req.params.id);
            res.json({ success: true, posts });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            status: 'running',
            activeJobs: scheduler.getActiveJobs().length
        });
    });

    // Start server
    app.listen(PORT, () => {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 URL Monitor Service Started');
        console.log('='.repeat(60));
        console.log(`📡 Server running on http://localhost:${PORT}`);
        console.log(`📊 Database: monitors.db`);
        console.log('='.repeat(60) + '\n');

        // Start scheduler
        scheduler.start();
    });
}

// Start the application
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (scheduler) scheduler.stopAll();
    db.close();
    process.exit(0);
});
