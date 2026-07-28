import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export interface IncidenciaCandidat {
  id: number;
  nombre: string;
  reemplazos_semana: number;
}

export interface IncidenciaData {
  id: number;
  estado: 'ventana_admin' | 'broadcast_activo' | 'resuelta' | 'sin_candidatos';
  franja: string;
  fecha: string;
  colaborador_afectado: {
    id: number;
    nombre: string;
  };
  colaborador_reemplazante: { id: number; nombre: string } | null;
  candidatos: IncidenciaCandidat[];
  motivo: string;
  admin_window_ends_at: string;
  created_at?: string;
}

export function useIncidencias() {
  const [incidencias, setIncidencias] = useState<IncidenciaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Suscribirse a cambios en tiempo real
    const q = query(
      collection(db, 'incidencias'),
      where('estado', 'not-in', ['resuelta'])
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const docs: IncidenciaData[] = [];
        querySnapshot.forEach((doc) => {
          docs.push({
            id: doc.data().id,
            ...doc.data(),
          } as IncidenciaData);
        });
        setIncidencias(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error leyendo incidencias:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { incidencias, loading, error };
}
