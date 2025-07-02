import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useUserRoles() {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserAndRoles() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Usuario desarrollador: acceso total
        if (user.email === 'melvinalvin.bello@gmail.com') {
          setRoles(['developer']);
          setLoading(false);
          return;
        }
        // Buscar roles en la base de datos
        const { data, error } = await supabase
          .from('usuario_roles')
          .select('roles(nombre)')
          .eq('user_id', user.id);

        if (error || !data) {
          setRoles([]);
        } else {
          setRoles(data.map(r => r.roles?.nombre).filter(Boolean));
        }
      }
      setLoading(false);
    }
    fetchUserAndRoles();
  }, []);

  return { user, roles, loading };
}