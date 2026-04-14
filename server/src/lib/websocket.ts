import WebSocket from 'ws';
import { Server as HttpServer } from 'http';
import { logger } from './logger';

let wss: WebSocket.Server | null = null;

export function initWebSocket(server: HttpServer) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    logger.debug('WebSocket client connected');

    ws.on('close', () => {
      logger.debug('WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket error');
    });
  });

  logger.info('WebSocket server initialized');
}

export function broadcast(event: string, data: unknown) {
  if (!wss) return;
  const message = JSON.stringify({ event, data, timestamp: Date.now() });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastJobProgress(jobId: string, leadId: string, progress: number, status: string) {
  broadcast('job:progress', { jobId, leadId, progress, status });
}

export function broadcastBatchProgress(batchId: string, stats: Record<string, number>) {
  broadcast('batch:progress', { batchId, ...stats });
}

export function broadcastLeadCompleted(leadId: string) {
  broadcast('lead:completed', { leadId });
}
