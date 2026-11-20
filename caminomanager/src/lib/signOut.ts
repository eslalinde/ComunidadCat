import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export async function signOut() {
  const { auth } = createClient();
  try {
    const { error } = await auth.signOut({ scope: 'local' });
    if (!error) return;
    const current = await auth.getSession();
    if (!current.error && !current.data.session) {
      toast.warning('Sesión cerrada en este dispositivo. No se pudo confirmar la revocación en el servidor.');
      return;
    }
  } catch {
    // Storage failures must remain visible to the user on a shared device.
  }
  toast.error('No se pudo confirmar el cierre de sesión. Inténtalo de nuevo.');
}
