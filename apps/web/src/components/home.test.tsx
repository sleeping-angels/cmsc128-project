import { render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Home } from './home';

function renderHome() {
  const router = createRouter({
    routeTree: createRootRoute({ component: Home }),
    history: createMemoryHistory(),
  });
  render(<RouterProvider router={router} />);
}

describe('Home', () => {
  it('renders the app name', async () => {
    renderHome();
    expect(await screen.findByRole('heading', { name: 'MIGO' })).toBeDefined();
  });

  it('links to the responder dashboard', async () => {
    renderHome();
    const link = await screen.findByRole('link', {
      name: 'Responder dashboard',
    });
    expect(link.getAttribute('href')).toBe('/dashboard');
  });
});
