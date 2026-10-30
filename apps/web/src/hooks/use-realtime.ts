import { useEffect, useEffectEvent } from 'react';
import { socket } from '@/lib/socket';

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
