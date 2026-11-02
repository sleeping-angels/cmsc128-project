import { useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
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
import { z } from 'zod';

const route = getRouteApi('/login');

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

export function LoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = route.useSearch();
  const [error, setError] = useState<string>();

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onChange: loginSchema, onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setError(undefined);
      // Catch everything: handleSubmit re-throws, which would surface as an
      // unhandled rejection.
      try {
        const { error } = await authClient.signIn.email(value);
        if (error) {
          setError(error.message ?? 'Sign-in failed.');
          return;
        }
      } catch {
        setError("Can't reach the server. Try again.");
        return;
      }
      // The cache may still hold "signed out" from before; drop it so the
      // dashboard guard fetches the new session.
      queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
      await navigate({ href: search.redirect ?? '/dashboard' });
    },
  });

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link to="/">
        <Wordmark className="text-3xl" />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Responder sign-in</CardTitle>
          <CardDescription>
            Use the account your MDRRMO admin gave you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field name="email">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="password">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        autoComplete="current-password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              {error && <FieldError>{error}</FieldError>}
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Field>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </Button>
                  </Field>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
