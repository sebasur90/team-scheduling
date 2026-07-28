import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface Franja {
  orden: number;
  hora: string;
  estado: 'ok' | 'riesgo' | 'critico';
  comercial_libre: number;
  operativo_libre: number;
}

interface BarometroData {
  estado: 'verde' | 'amarillo' | 'rojo';
  franjas: Franja[];
  incidencias_activas: number;
}

export function useBarometro() {
  const [barometro, setBarometro] = useState<BarometroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Suscribirse a cambios en tiempo real
    const unsubscribe = onSnapshot(
      doc(db, 'sucursal', 'default', 'data', 'barometro'),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setBarometro(docSnapshot.data() as BarometroData);
        } else {
          setBarometro({
            estado: 'verde',
            franjas: [],
            incidencias_activas: 0,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error leyendo barometro:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { barometro, loading, error };
}
