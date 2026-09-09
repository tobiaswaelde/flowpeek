import { Subject } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';

import type { AuthService } from '../auth/auth.service.js';
import { SystemStatusGateway } from './system-status.gateway.js';
import type { SystemStatusService } from './system-status.service.js';
import { SYSTEM_STATUS_EVENT, type SystemStatusSnapshot } from './system-status.types.js';

describe('SystemStatusGateway', () => {
  const snapshot: SystemStatusSnapshot = {
    activity: null,
    runningWorkflowCount: 2,
    updatedAt: '2026-09-09T08:00:00.000Z',
  };

  it('authenticates sockets, sends the current snapshot, and broadcasts changes', async () => {
    const changes = new Subject<SystemStatusSnapshot>();
    const auth = { authenticateAccessToken: jest.fn().mockResolvedValue({ id: 'user-id' }) };
    const status = { changes$: changes.asObservable(), getSnapshot: jest.fn().mockReturnValue(snapshot) };
    const room = { emit: jest.fn() };
    const gateway = new SystemStatusGateway(auth as unknown as AuthService, status as unknown as SystemStatusService);
    gateway.server = { to: jest.fn().mockReturnValue(room) } as unknown as Namespace;
    gateway.afterInit();
    const client = {
      disconnect: jest.fn(),
      emit: jest.fn(),
      handshake: { auth: { token: 'access-token' } },
      join: jest.fn().mockResolvedValue(undefined),
    } as unknown as Socket;

    await gateway.handleConnection(client);
    changes.next(snapshot);

    expect(auth.authenticateAccessToken).toHaveBeenCalledWith('access-token');
    expect(client.join).toHaveBeenCalledWith('authenticated-status-clients');
    expect(client.emit).toHaveBeenCalledWith(SYSTEM_STATUS_EVENT, snapshot);
    expect(room.emit).toHaveBeenCalledWith(SYSTEM_STATUS_EVENT, snapshot);
    gateway.onModuleDestroy();
  });

  it('disconnects sockets that do not provide a valid access token', async () => {
    const auth = { authenticateAccessToken: jest.fn().mockRejectedValue(new Error('invalid')) };
    const status = { changes$: new Subject().asObservable(), getSnapshot: jest.fn() };
    const gateway = new SystemStatusGateway(auth as unknown as AuthService, status as unknown as SystemStatusService);
    const client = {
      disconnect: jest.fn(),
      emit: jest.fn(),
      handshake: { auth: { token: 'invalid' } },
      join: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
  });
});
