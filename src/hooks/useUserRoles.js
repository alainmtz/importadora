import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useUserRoles() {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserAndRoles() {
      setLoading(true);
      try {
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
            console.warn('Error fetching user roles:', error);
            setRoles([]);
          } else {
            const roleNames = data.map(r => r.roles?.nombre).filter(Boolean);
            setRoles(roleNames);
          }
        } else {
          setRoles([]);
        }
      } catch (error) {
        console.error('Error in useUserRoles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUserAndRoles();
  }, []);

  return { user, roles, loading };
}