/**
 * Slack Channel
 * 实现 Slack 机器人的消息接收和发送
 */

import * as crypto from 'crypto';
import { ChannelBase, withRetry } from '../channel-base';
import { log, logError, logWarn } from '../../../utils/logger';
import type {
  SlackChannelConfig,
  RemoteMessage,
  RemoteResponse,
  RemoteResponseContent,
} from '../../types';

// Lazy-loaded Slack SDK types
type SlackApp = import('@slack/bolt').App;
type SlackWebClient = import('@slack/web-api').WebClient;

export class SlackChannel extends ChannelBase {
  readonly type = 'slack' as const;

  private config: SlackChannelConfig;
  private app?: SlackApp;
  private client?: SlackWebClient;
  private botUserId?: string;

  constructor(config: SlackChannelConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (this._connected) {
      logWarn('[Slack] Channel already started');
      return;
    }

    this.logStatus('Starting channel...');

    try {
      const { App } = await import('@slack/bolt');
      const { WebClient } = await import('@slack/web-api');

      const appOptions: ConstructorParameters<typeof App>[0] = {
        token: this.config.botToken,
        signingSecret: this.config.signingSecret || 'placeholder',
      };

      if (this.config.useSocketMode) {
        if (!this.config.appToken) {
          throw new Error('appToken is required for Socket Mode');
        }
        appOptions.socketMode = true;
        appOptions.appToken = this.config.appToken;
      }

      this.app = new App(appOptions);
      this.client = new WebClient(this.config.botToken);

      // Get bot user ID
      const authResult = await this.client.auth.test();
      this.botUserId = authResult.user_id as string;
      log('[Slack] Bot user ID:', this.botUserId);

      // Register message handler
      this.app.message(async ({ message, say: _say }) => {
        try {
          const msg = message as unknown as Record<string, unknown>;

          // Skip bot messages
          if (msg.bot_id || msg.subtype === 'bot_message') return;
          if (msg.user === this.botUserId) return;

          const text = String(msg.text || '');
          const channelId = String(msg.channel || '');
          const userId = String(msg.user || '');
          const ts = String(msg.ts || '');
          const threadTs = msg.thread_ts as string | undefined;
          const isGroup = !channelId.startsWith('D'); // DM channels start with 'D'

          // Check if bot is mentioned
          const isMentioned = this.botUserId ? text.includes(`<@${this.botUserId}>`) : false;

          // Strip bot mention from text
          const cleanText = this.botUserId
            ? text.replace(new RegExp(`<@${this.botUserId}>\\s*`, 'g'), '').trim()
            : text;

          const remoteMessage: RemoteMessage = {
            id: ts,
            channelType: 'slack',
            channelId: threadTs ? `${channelId}:${threadTs}` : channelId,
            sender: {
              id: userId,
              isBot: false,
            },
            content: {
              type: 'text',
              text: cleanText,
            },
            timestamp: Math.floor(parseFloat(ts) * 1000),
            isGroup,
            isMentioned,
            raw: message,
          };

          this.emitMessage(remoteMessage);
        } catch (error) {
          logError('[Slack] Error processing message:', error);
        }
      });

      if (this.config.useSocketMode) {
        await this.app.start();
        log('[Slack] Socket Mode started');
      } else {
        // Webhook mode: start HTTP receiver on a separate port
        await this.app.start(0); // port 0 = OS assigns
        log('[Slack] Webhook mode started');
      }

      this._connected = true;
      this.logStatus('Channel started successfully');
    } catch (error) {
      logError('[Slack] Failed to start channel:', error);
      this._connected = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this._connected) return;

    this.logStatus('Stopping channel...');

    try {
      await this.app?.stop();
    } catch {
      // ignore
    }

    this.app = undefined;
    this.client = undefined;
    this._connected = false;
    this.logStatus('Channel stopped');
  }

  async send(response: RemoteResponse): Promise<void> {
    if (!this._connected || !this.client) {
      throw new Error('Channel not connected');
    }

    const { channelId, content } = response;

    await withRetry(
      async () => {
        await this.sendMessage(channelId, content);
      },
      {
        maxRetries: 3,
        delayMs: 1000,
        onRetry: (attempt, error) => {
          logWarn(`[Slack] Send retry ${attempt}:`, error.message);
        },
      }
    );
  }

  /**
   * Handle incoming webhook request (for webhook mode)
   */
  handleWebhook(
    headers: Record<string, string>,
    body: string
  ): { status: number; data: Record<string, unknown> } {
    // Verify Slack signature
    if (!this.verifySlackSignature(headers, body)) {
      logWarn('[Slack] Webhook signature verification failed');
      return { status: 403, data: { error: 'Invalid signature' } };
    }

    try {
      const data = JSON.parse(body) as Record<string, unknown>;

      // Handle URL verification challenge
      if (data.type === 'url_verification') {
        return { status: 200, data: { challenge: data.challenge } };
      }

      return { status: 200, data: { ok: true } };
    } catch (error) {
      logError('[Slack] Webhook handling error:', error);
      return { status: 500, data: { error: 'Internal error' } };
    }
  }

  private verifySlackSignature(headers: Record<string, string>, body: string): boolean {
    const signingSecret = this.config.signingSecret;
    if (!signingSecret) return false;

    const timestamp = headers['x-slack-request-timestamp'];
    const signature = headers['x-slack-signature'];
    if (!timestamp || !signature) return false;

    // Prevent replay attacks: reject requests older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    const sigBase = `v0:${timestamp}:${body}`;
    const computed = `v0=${crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex')}`;

    const sigBuf = Buffer.from(signature);
    const computedBuf = Buffer.from(computed);
    if (sigBuf.length !== computedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, computedBuf);
  }

  private async sendMessage(channelId: string, content: RemoteResponseContent): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    // channelId may be "channelId:threadTs" for threaded replies
    const [channel, threadTs] = channelId.split(':');

    let text: string;
    switch (content.type) {
      case 'text':
        text = content.text || '';
        break;
      case 'markdown':
        text = content.markdown || '';
        break;
      default:
        text = content.text || String(content);
    }

    // Slack message limit is ~40000 chars, split at 3800 to be safe
    const chunks = this.splitMessage(text, 3800);
    for (const chunk of chunks) {
      await this.client.chat.postMessage({
        channel,
        text: chunk,
        thread_ts: threadTs,
        mrkdwn: true,
      });
      if (chunks.length > 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
}
