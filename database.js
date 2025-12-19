const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class MonitorDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, 'monitors.db');
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        const SQL = await initSqlJs();

        // Load existing database or create new one
        if (fs.existsSync(this.dbPath)) {
            const buffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
        } else {
            this.db = new SQL.Database();
        }

        this.initTables();
        this.save();
    }

    initTables() {
        // Monitors table
        this.db.run(`
      CREATE TABLE IF NOT EXISTS monitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        interval TEXT NOT NULL,
        slack_webhook TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_check DATETIME
      )
    `);

        // Posts table to track discovered posts
        this.db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        monitor_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
        UNIQUE(monitor_id, link)
      )
    `);
    }

    save() {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.dbPath, buffer);
    }

    // Monitor operations
    addMonitor(url, interval, slackWebhook) {
        const escapedUrl = url.replace(/'/g, "''");
        const escapedWebhook = slackWebhook.replace(/'/g, "''");
        this.db.exec(
            `INSERT INTO monitors (url, interval, slack_webhook) VALUES ('${escapedUrl}', '${interval}', '${escapedWebhook}')`
        );
        const result = this.db.exec('SELECT last_insert_rowid() as id');
        this.save();
        return result[0].values[0][0];
    }

    getMonitor(id) {
        const result = this.db.exec('SELECT * FROM monitors WHERE id = ?', [id]);
        if (result.length === 0) return null;
        return this.rowToObject(result[0]);
    }

    getAllMonitors() {
        const result = this.db.exec('SELECT * FROM monitors WHERE active = 1');
        if (result.length === 0) return [];
        return this.rowsToObjects(result[0]);
    }

    updateLastCheck(id) {
        this.db.exec(
            `UPDATE monitors SET last_check = datetime('now') WHERE id = ${parseInt(id)}`
        );
        this.save();
    }

    deleteMonitor(id) {
        try {
            this.db.exec('DELETE FROM monitors WHERE id = ' + parseInt(id));
            this.db.exec('DELETE FROM posts WHERE monitor_id = ' + parseInt(id));
            this.save();
            return true;
        } catch (error) {
            console.error('Error deleting monitor:', error);
            return false;
        }
    }

    // Post operations
    addPost(monitorId, title, link) {
        try {
            const escapedTitle = title.replace(/'/g, "''");
            const escapedLink = link.replace(/'/g, "''");
            this.db.exec(
                `INSERT INTO posts (monitor_id, title, link) VALUES (${parseInt(monitorId)}, '${escapedTitle}', '${escapedLink}')`
            );
            this.save();
            return true;
        } catch (error) {
            // Duplicate post (already exists)
            return false;
        }
    }

    getPostsByMonitor(monitorId) {
        const result = this.db.exec(
            'SELECT * FROM posts WHERE monitor_id = ? ORDER BY discovered_at DESC',
            [monitorId]
        );
        if (result.length === 0) return [];
        return this.rowsToObjects(result[0]);
    }

    postExists(monitorId, link) {
        const result = this.db.exec(
            'SELECT COUNT(*) as count FROM posts WHERE monitor_id = ? AND link = ?',
            [monitorId, link]
        );
        return result[0].values[0][0] > 0;
    }

    // Helper methods
    rowToObject(result) {
        if (!result || !result.values || result.values.length === 0) return null;
        const obj = {};
        result.columns.forEach((col, i) => {
            obj[col] = result.values[0][i];
        });
        return obj;
    }

    rowsToObjects(result) {
        if (!result || !result.values) return [];
        return result.values.map(row => {
            const obj = {};
            result.columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });
    }

    close() {
        if (this.db) {
            this.save();
            this.db.close();
        }
    }
}

module.exports = MonitorDatabase;
