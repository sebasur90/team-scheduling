import client from './client'

export interface DiaNoLaborable {
  fecha: string
  motivo: string
}

export interface DiaNoLaborableCreate {
  fecha: string
  motivo: string
}

export const diasNolaborablesApi = {
  list: (mes: string) =>
    client.get<DiaNoLaborable[]>(`/dias-no-laborables?mes=${mes}`),
  create: (data: DiaNoLaborableCreate) =>
    client.post<DiaNoLaborable>('/dias-no-laborables', data),
  delete: (fecha: string) =>
    client.delete(`/dias-no-laborables/${fecha}`),
}
