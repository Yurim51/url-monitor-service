const { IncomingWebhook } = require('@slack/webhook');

class SlackNotifier {
    constructor(webhookUrl) {
        // Use provided webhook or fallback to console logging
        this.webhookUrl = webhookUrl;
        this.useWebhook = webhookUrl && webhookUrl.startsWith('http');

        if (this.useWebhook) {
            this.webhook = new IncomingWebhook(webhookUrl);
        }
    }

    async sendNotification(url, newPosts) {
        const message = this.formatMessage(url, newPosts);

        if (this.useWebhook) {
            try {
                await this.webhook.send(message);
                console.log(`✅ Slack notification sent for ${newPosts.length} new post(s)`);
                return true;
            } catch (error) {
                console.error('❌ Failed to send Slack notification:', error.message);
                // Fallback to console
                this.logToConsole(url, newPosts);
                return false;
            }
        } else {
            // No webhook configured, log to console
            this.logToConsole(url, newPosts);
            return true;
        }
    }

    formatMessage(url, newPosts) {
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🔔 New Posts Detected!',
                    emoji: true
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*URL:* ${url}\n*New Posts:* ${newPosts.length}`
                }
            },
            {
                type: 'divider'
            }
        ];

        // Add each post
        newPosts.forEach((post, index) => {
            if (index < 10) { // Limit to 10 posts to avoid message size limits
                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${index + 1}.* <${post.link}|${post.title}>`
                    }
                });
            }
        });

        if (newPosts.length > 10) {
            blocks.push({
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `_...and ${newPosts.length - 10} more posts_`
                    }
                ]
            });
        }

        return { blocks };
    }

    logToConsole(url, newPosts) {
        console.log('\n' + '='.repeat(60));
        console.log('🔔 NEW POSTS DETECTED');
        console.log('='.repeat(60));
        console.log(`URL: ${url}`);
        console.log(`Count: ${newPosts.length} new post(s)`);
        console.log('-'.repeat(60));
        newPosts.forEach((post, index) => {
            console.log(`${index + 1}. ${post.title}`);
            console.log(`   ${post.link}`);
        });
        console.log('='.repeat(60) + '\n');
    }
}

module.exports = SlackNotifier;
