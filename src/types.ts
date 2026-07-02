// Mükellef (Müşteri) Tanımı
export interface Client {
  id: string;
  companyCode: string;
  name: string;
  isDeleted: boolean;
}

// Sütun Tipi: Tik (evet/hayır) ya da Çoklu Durum
export type ColumnType = 'checkbox' | 'status';

// Çoklu Durum sütunlarında kullanıcının tanımladığı her bir durum
export interface StatusOption {
  key: string;
  label: string;
  color: string;
}

// Sütun Başlıkları (Yapılacaklar)
export interface TaskColumn {
  id: string;
  title: string;
  order: number;
  type: ColumnType;
  statuses?: StatusOption[]; // yalnızca type === 'status' için
}

// Tik sütunlarında tek geçerli değer
export const CHECKED = 'checked' as const;

// Durum/renk seçimi için kullanılabilecek sabit renk paleti
export interface ColorSwatch {
  name: string;
  dot: string;
  bg: string;
  hoverBg: string;
  text: string;
  ring: string;
  border: string;
}

export const COLOR_PALETTE: ColorSwatch[] = [
  { name: 'rose', dot: 'bg-rose-500', bg: 'bg-rose-50', hoverBg: 'hover:bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200', border: 'border-rose-300' },
  { name: 'amber', dot: 'bg-amber-500', bg: 'bg-amber-50', hoverBg: 'hover:bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-200', border: 'border-amber-300' },
  { name: 'emerald', dot: 'bg-emerald-500', bg: 'bg-emerald-50', hoverBg: 'hover:bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200', border: 'border-emerald-300' },
  { name: 'sky', dot: 'bg-sky-500', bg: 'bg-sky-50', hoverBg: 'hover:bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-200', border: 'border-sky-300' },
  { name: 'violet', dot: 'bg-violet-500', bg: 'bg-violet-50', hoverBg: 'hover:bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-200', border: 'border-violet-300' },
  { name: 'slate', dot: 'bg-slate-500', bg: 'bg-slate-50', hoverBg: 'hover:bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', border: 'border-slate-300' },
];

export function colorOf(name: string): ColorSwatch {
  return COLOR_PALETTE.find(c => c.name === name) ?? COLOR_PALETTE[5];
}

// Tablodaki Her Bir Kutucuğun Durumu (kim, ne zaman işaretledi)
export interface CellEntry {
  value: string; // durum anahtarı, ya da CHECKED
  updatedBy: string;
  updatedAt: number;
}

// Not aciliyet seviyesi
export type NoteUrgency = 'low' | 'medium' | 'high';

// Ortak Not Alanı
export interface SharedNote {
  id: string;
  monthYear: string;
  content: string;
  createdBy: string;
  createdAt: number;
  isDeleted: boolean;
  urgency: NoteUrgency;
}
