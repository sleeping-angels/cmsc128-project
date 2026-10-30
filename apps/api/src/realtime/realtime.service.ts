import { Injectable } from '@nestjs/common';
import {
  DASHBOARD_ROOM,
  RealtimeGateway,
  userRoom,
} from './realtime.gateway.js';

/** Pushes server events to dashboard clients. Inject it from other modules. */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  /** Sends to every connected dashboard user. */
  toDashboard(event: string, payload: unknown) {
    this.gateway.server.to(DASHBOARD_ROOM).emit(event, payload);
  }

  /** Sends to every connection of one user. */
  toUser(userId: string, event: string, payload: unknown) {
    this.gateway.server.to(userRoom(userId)).emit(event, payload);
  }
}
