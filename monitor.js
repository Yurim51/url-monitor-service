const axios = require('axios');
const cheerio = require('cheerio');
const SlackNotifier = require('./slack');

class URLMonitor {
    constructor(database) {
        this.db = database;
    }

    async checkMonitor(monitorId) {
        const monitor = this.db.getMonitor(monitorId);

        if (!monitor || !monitor.active) {
            console.log(`Monitor ${monitorId} not found or inactive`);
            return;
        }

        console.log(`\n🔍 Checking monitor #${monitorId}: ${monitor.url}`);

        try {
            // Fetch the URL
            const https = require('https');
            const response = await axios.get(monitor.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            });

            // Parse HTML
            const $ = cheerio.load(response.data);
            const posts = this.extractPosts($, monitor.url);

            console.log(`📄 Found ${posts.length} total posts on page`);

            // Check for new posts
            const newPosts = [];
            for (const post of posts) {
                const isNew = this.db.addPost(monitorId, post.title, post.link);
                if (isNew) {
                    newPosts.push(post);
                }
            }

            // Update last check time
            this.db.updateLastCheck(monitorId);

            if (newPosts.length > 0) {
                console.log(`✨ ${newPosts.length} new post(s) detected!`);

                // Send Slack notification
                const notifier = new SlackNotifier(monitor.slack_webhook);
                await notifier.sendNotification(monitor.url, newPosts);
            } else {
                console.log(`✓ No new posts (all ${posts.length} posts already tracked)`);
            }

            return {
                success: true,
                totalPosts: posts.length,
                newPosts: newPosts.length,
                newPostsData: newPosts
            };

        } catch (error) {
            console.error(`❌ Error checking monitor #${monitorId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    extractPosts($, baseUrl) {
        const posts = [];

        // KOFIA-specific selector (adjust for other sites)
        // Looking for links in the job posting list
        $('a').each((i, elem) => {
            const $link = $(elem);
            const href = $link.attr('href');
            const text = $link.text().trim();

            // Filter for actual job postings (contain view.do and have meaningful text)
            if (href && href.includes('view.do') && text && text.length > 5) {
                // Build full URL
                let fullUrl = href;
                if (href.startsWith('/')) {
                    const urlObj = new URL(baseUrl);
                    fullUrl = `${urlObj.protocol}//${urlObj.host}${href}`;
                } else if (!href.startsWith('http')) {
                    fullUrl = new URL(href, baseUrl).href;
                }

                // Extract sequence number for uniqueness
                const seqMatch = href.match(/seq=(\d+)/);
                if (seqMatch) {
                    posts.push({
                        title: text,
                        link: fullUrl
                    });
                }
            }
        });

        // Remove duplicates based on link
        const uniquePosts = [];
        const seenLinks = new Set();

        for (const post of posts) {
            if (!seenLinks.has(post.link)) {
                seenLinks.add(post.link);
                uniquePosts.push(post);
            }
        }

        return uniquePosts;
    }

    async checkAllMonitors() {
        const monitors = this.db.getAllMonitors();
        console.log(`\n🔄 Checking ${monitors.length} active monitor(s)...`);

        const results = [];
        for (const monitor of monitors) {
            const result = await this.checkMonitor(monitor.id);
            results.push({ monitorId: monitor.id, ...result });
        }

        return results;
    }
}

module.exports = URLMonitor;
