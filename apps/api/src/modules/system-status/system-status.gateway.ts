import { type OnModuleDestroy } from '@nestjs/common';
import { type OnGatewayConnection, type OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Subscription } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';

import { ENV } from '../../config/env.js';
import { getCorsOrigins } from '../../config/http.js';
import { AuthService } from '../auth/auth.service.js';
import { SystemStatusService } from './system-status.service.js';
import { SYSTEM_STATUS_EVENT } from './system-status.types.js';

const AUTHENTICATED_STATUS_ROOM = 'authenticated-status-clients';

/** Publishes global read-only API status to authenticated Socket.IO clients. */
@WebSocketGateway({
  namespace: '/status',
  cors: { origin: getCorsOrigins(ENV.CORS_ORIGIN) },
})
export class SystemStatusGateway implements OnGatewayConnection, OnGatewayInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Namespace;

  private statusSubscription?: Subscription;

  constructor(
    private readonly auth: AuthService,
    private readonly status: SystemStatusService,
  ) {}

  afterInit(): void {
    this.statusSubscription = this.status.changes$.subscribe((snapshot) => {
      this.server.to(AUTHENTICATED_STATUS_ROOM).emit(SYSTEM_STATUS_EVENT, snapshot);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const accessToken = client.handshake.auth.token;
    if (typeof accessToken !== 'string') {
      client.disconnect(true);
      return;
    }

    try {
      await this.auth.authenticateAccessToken(accessToken);
      await client.join(AUTHENTICATED_STATUS_ROOM);
      client.emit(SYSTEM_STATUS_EVENT, this.status.getSnapshot());
    } catch {
      client.disconnect(true);
    }
  }

  onModuleDestroy(): void {
    this.statusSubscription?.unsubscribe();
  }
}
