// Supabase's local mode clears storage before the HTTP call. ComunidadCat also
// revokes other devices, so the single request to Auth must use global scope.
export function withGlobalLogout(url: string, transport: typeof fetch): typeof fetch {
  const logout = new URL('auth/v1/logout', url.replace(/\/?$/, '/'));
  return (input, init) => {
    if (typeof input === 'string' && init?.method === 'POST') {
      const request = new URL(input, logout);
      if (request.origin === logout.origin && request.pathname === logout.pathname &&
          request.searchParams.get('scope') === 'local') {
        request.searchParams.set('scope', 'global');
        return transport(request.href, init);
      }
    }
    return transport(input, init);
  };
}
