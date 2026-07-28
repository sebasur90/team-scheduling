import { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, collectionGroup, query, where, onSnapshot } from 'firebase/firestore';

export interface UserNotification {
  id: number;
  tipo: string;
  franja?: string;
  fecha?: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'expirada';
  expires_at?: string;
  incidencia_id?: string;
  created_at?: string;
}

export function useUserNotifications() {
  const { user } = useAuthContext();
  const [notificaciones, setNotificaciones] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Suscribirse a notificaciones del usuario actual
    const q = query(
      collection(db, 'notificaciones', String(user.id), 'items')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const docs: UserNotification[] = [];
        querySnapshot.forEach((doc) => {
          docs.push({
            id: doc.data().id,
            ...doc.data(),
          } as UserNotification);
        });
        setNotificaciones(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error leyendo notificaciones:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  return { notificaciones, loading, error };
}
