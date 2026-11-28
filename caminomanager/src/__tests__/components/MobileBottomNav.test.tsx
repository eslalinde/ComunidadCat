import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { UserScope } from '@/lib/permissions';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  isMobile: true,
  openMobile: false,
  setOpenMobile: vi.fn(),
  scope: null as UserScope | null,
}));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userScope: mocks.scope }) }));
vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => ({
    isMobile: mocks.isMobile,
    openMobile: mocks.openMobile,
    setOpenMobile: mocks.setOpenMobile,
  }),
}));

import { MobileBottomNav, isBottomNavItemActive } from '@/components/ui/mobile-bottom-nav';

const adminScope: UserScope = {
  role: 'admin',
  person_id: null,
  zone_id: null,
  community_id: null,
  has_community_grants: false,
};

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mocks.pathname = '/';
    mocks.isMobile = true;
    mocks.scope = adminScope;
    mocks.setOpenMobile.mockClear();
  });

  it('renders nothing on desktop', () => {
    mocks.isMobile = false;
    const { container } = render(<MobileBottomNav />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows up to four destinations plus "Más" for admins', () => {
    render(<MobileBottomNav />);
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    const links = nav.querySelectorAll('a');
    expect(Array.from(links).map((link) => link.textContent)).toEqual([
      'Inicio',
      'Comunidades',
      'Parroquias',
      'Personas',
    ]);
    expect(screen.getByRole('button', { name: 'Más opciones de navegación' })).toBeInTheDocument();
  });

  it('marks the current section and opens the sidebar from "Más"', async () => {
    mocks.pathname = '/comunidades/detalle';
    render(<MobileBottomNav />);
    expect(screen.getByRole('link', { name: 'Comunidades' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Más opciones de navegación' }));
    expect(mocks.setOpenMobile).toHaveBeenCalledWith(true);
  });

  it('hides sections the user cannot see', () => {
    mocks.scope = { ...adminScope, role: 'viewer' };
    render(<MobileBottomNav />);
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comunidades' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Personas' })).not.toBeInTheDocument();
  });
});

describe('isBottomNavItemActive', () => {
  it('matches home only on the root path', () => {
    expect(isBottomNavItemActive('/', '/')).toBe(true);
    expect(isBottomNavItemActive('/personas', '/')).toBe(false);
    expect(isBottomNavItemActive('/personas', '/personas')).toBe(true);
  });
});
