export type LeadStatus = 'Contactado' | 'Nuevo Cierre' | 'Rechazado' | 'Pendiente';

export type LeadType = 'Alianza' | 'Lead' | 'Lead Potencial' | 'Proveedor' | 'Cliente';

export interface Lead {
  id: string;
  no: number | string;
  nombre: string;
  apellidos: string;
  empresa: string;
  evento: string;
  notas: string;
  leadGenerator: string;
  giroServicio: string;
  tipo: LeadType | string;
  celular: string;
  telefonoFijo: string;
  correo: string;
  paginaWeb: string;
  puesto: string;
  direccion: string;
  status: LeadStatus;
  createdAt: string;
  photoUrl?: string;
  photoBackUrl?: string;
  confidence?: number;
  rawTextSummary?: string;
  ocrTextLines?: string[];
}

export interface ExtractedLeadData {
  nombre: string;
  apellidos: string;
  empresa: string;
  evento?: string;
  notas?: string;
  leadGenerator?: string;
  giroServicio?: string;
  tipo?: string;
  celular?: string;
  telefonoFijo?: string;
  correo?: string;
  paginaWeb?: string;
  puesto?: string;
  direccion?: string;
  status?: string;
  confidence?: number;
  rawTextSummary?: string;
  ocrTextLines?: string[];
}
