import {
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Server } from 'socket.io';
import { env } from '../config/env.js';

/** Room every authenticated dashboard connection joins. */
export const DASHBOARD_ROOM = 'dashboard';

export const userRoom = (userId: string) => `user:${userId}`;

@WebSocketGateway({ cors: { origin: env.WEB_URL, credentials: true } })
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly authService: AuthService) {}

  /** Rejects handshakes without a Better Auth session cookie. */
  afterInit(server: Server) {
    server.use((socket, next) => {
      this.authService.api
        .getSession({ headers: fromNodeHeaders(socket.handshake.headers) })
        .then((session) => {
          if (!session) return next(new Error('UNAUTHORIZED'));
          socket.data.user = session.user;
          void socket.join([DASHBOARD_ROOM, userRoom(session.user.id)]);
          next();
        })
        .catch(next);
    });
  }
}
