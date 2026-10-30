import { useQueryClient } from '@tanstack/react-query';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Wordmark } from '@/components/wordmark';
import { authClient } from '@/lib/auth-client';
import { sessionQuery } from '@/lib/session';

const route = getRouteApi('/login');

export function LoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = route.useSearch();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const { error } = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Sign-in failed.');
      return;
    }
    // The cache may still hold "signed out" from before; drop it so the
    // dashboard guard fetches the new session.
    queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
    await navigate({ href: search.redirect ?? '/dashboard' });
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Wordmark className="text-3xl" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Responder sign-in</CardTitle>
          <CardDescription>
            Use the account your MDRRMO admin gave you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Signing in…' : 'Sign in'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
