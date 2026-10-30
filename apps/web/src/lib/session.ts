import { queryOptions } from '@tanstack/react-query';
import { authClient } from './auth-client';

/** The signed-in session, or null. Route guards read it from the cache. */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async () => (await authClient.getSession()).data,
});
