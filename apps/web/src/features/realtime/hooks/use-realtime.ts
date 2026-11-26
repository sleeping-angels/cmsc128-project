import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { socket } from '../socket';

/** Keeps the realtime connection open while the calling component is mounted. */
export function useRealtimeConnection() {
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);
}

/** Runs `handler` for every `event` the server pushes. */
export function useRealtimeEvent<T>(
  event: string,
  handler: (payload: T) => void,
) {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    socket.on(event, onEvent);
    return () => {
      socket.off(event, onEvent);
    };
  }, [event]);
}

/**
 * Runs `handler` after the connection comes back from a drop, so pages can
 * refetch what they missed: the server doesn't replay events sent while down.
 */
export function useRealtimeReconnect(handler: () => void) {
  const onReconnect = useEffectEvent(handler);

  useEffect(() => {
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.io.off('reconnect', onReconnect);
    };
  }, []);
}

function subscribe(onChange: () => void) {
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
}

/** Whether the realtime connection is up, so pages can say if they're live. */
export function useRealtimeConnected() {
  return useSyncExternalStore(subscribe, () => socket.connected);
}
