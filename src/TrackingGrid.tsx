import { useEffect, useRef, useState } from 'react';
import type { Client, TaskColumn, CellEntry } from './types';
import { CHECKED, colorOf } from './types';

const cellKey = (clientId: string, columnId: string) => `${clientId}::${columnId}`;

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];

function avatarColor(seed: string) {
  const idx = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface TrackingGridProps {
  clients: Client[];
  columns: TaskColumn[];
  cellData: Record<string, CellEntry>;
  onCellChange: (clientId: string, columnId: string, value: string | null) => void;
  onDeleteClient: (clientId: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export default function TrackingGrid({
  clients,
  columns,
  cellData,
  onCellChange,
  onDeleteClient,
  onDeleteColumn,
}: TrackingGridProps) {
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<{ clientId: string; columnId: string; top: number; left: number } | null>(null);
  const [tip, setTip] = useState<{ top: number; left: number; text: string } | null>(null);
  const [sort, setSort] = useState<{ key: 'client' | string; dir: 'asc' | 'desc' } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const closeOnScroll = () => setMenu(null);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [menu]);

  const menuColumn = menu ? columns.find(c => c.id === menu.columnId) : undefined;

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, clientId: string, columnId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ clientId, columnId, top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 160) });
    setTip(null);
  };

  const pick = (value: string | null) => {
    if (menu) onCellChange(menu.clientId, menu.columnId, value);
    setMenu(null);
  };

  const showTip = (e: React.MouseEvent<HTMLButtonElement>, entry: CellEntry | undefined) => {
    if (!entry) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTip({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
      text: `${entry.updatedBy} · ${formatTime(entry.updatedAt)}`,
    });
  };

  const toggleSort = (key: 'client' | string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const columnRank = (client: Client, col: TaskColumn) => {
    const entry = cellData[cellKey(client.id, col.id)];
    if (col.type === 'checkbox') return entry?.value === CHECKED ? 1 : 0;
    if (!entry) return -1;
    const idx = col.statuses?.findIndex(s => s.key === entry.value) ?? -1;
    return idx;
  };

  const filteredClients = clients.filter(c => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return true;
    return c.name.toLocaleLowerCase('tr-TR').includes(q) || c.companyCode.toLocaleLowerCase('tr-TR').includes(q);
  });

  const sortedClients = [...filteredClients];
  if (sort) {
    const dirMul = sort.dir === 'asc' ? 1 : -1;
    if (sort.key === 'client') {
      sortedClients.sort((a, b) => {
        const numA = parseInt(a.companyCode, 10);
        const numB = parseInt(b.companyCode, 10);
        const cmp = !isNaN(numA) && !isNaN(numB) ? numA - numB : a.companyCode.localeCompare(b.companyCode);
        return cmp * dirMul;
      });
    } else {
      const col = columns.find(c => c.id === sort.key);
      if (col) {
        sortedClients.sort((a, b) => (columnRank(a, col) - columnRank(b, col)) * dirMul);
      }
    }
  }

  const completion = (clientId: string) => {
    if (columns.length === 0) return 0;
    const done = columns.filter(col => {
      const entry = cellData[cellKey(clientId, col.id)];
      if (!entry) return false;
      if (col.type === 'checkbox') return entry.value === CHECKED;
      const last = col.statuses?.[col.statuses.length - 1];
      return last ? entry.value === last.key : false;
    }).length;
    return Math.round((done / columns.length) * 100);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Araç Çubuğu */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
        <div className="relative w-full max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Mükellef ara..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 flex items-center justify-center text-white text-[9px]">✓</span>
          Tik
        </span>
      </div>

      {/* Tablo */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-sm">Henüz mükellef eklenmedi.</p>
          <p className="text-xs mt-1">Sağ üstteki (+) butonundan ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th
                  onClick={() => toggleSort('client')}
                  className="sticky left-0 z-20 bg-gray-50/70 backdrop-blur text-left font-semibold text-gray-600 px-5 py-3 min-w-[220px] cursor-pointer select-none hover:text-gray-900"
                >
                  <span className="inline-flex items-center gap-1">
                    Mükellef
                    {sort?.key === 'client' && <span className="text-[10px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                  </span>
                </th>
                {columns.map(col => (
                  <th
                    key={col.id}
                    onClick={() => toggleSort(col.id)}
                    className="group font-semibold text-gray-600 px-4 py-3 text-center min-w-[130px] whitespace-nowrap cursor-pointer select-none hover:text-gray-900"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.title}
                      {sort?.key === col.id && <span className="text-[10px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteColumn(col.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 transition-opacity"
                        title="Sütunu sil"
                      >
                        ✕
                      </button>
                    </span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {col.type === 'checkbox' ? (
                        <span className="text-[10px] font-normal text-gray-400">Tik</span>
                      ) : (
                        (col.statuses ?? []).map(s => (
                          <span key={s.key} className={`w-1.5 h-1.5 rounded-full ${colorOf(s.color).dot}`} title={s.label} />
                        ))
                      )}
                    </div>
                  </th>
                ))}
                <th className="font-semibold text-gray-600 px-4 py-3 text-center min-w-[110px]">İlerleme</th>
                <th className="px-3 py-3 min-w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client, idx) => (
                <tr key={client.id} className={`group/row border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="sticky left-0 z-10 bg-inherit px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(client.id)}`}>
                        {initials(client.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{client.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{client.companyCode}</p>
                      </div>
                    </div>
                  </td>
                  {columns.map(col => {
                    const entry = cellData[cellKey(client.id, col.id)];

                    if (col.type === 'checkbox') {
                      const checked = entry?.value === CHECKED;
                      return (
                        <td key={col.id} className="px-4 py-3 text-center">
                          <button
                            onClick={() => onCellChange(client.id, col.id, checked ? null : CHECKED)}
                            onMouseEnter={e => showTip(e, entry)}
                            onMouseLeave={() => setTip(null)}
                            className={`w-8 h-8 mx-auto rounded-lg border transition-all flex items-center justify-center
                              ${checked ? 'bg-emerald-50 text-emerald-600 border-transparent ring-1 ring-emerald-200' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                          >
                            {checked ? <span className="text-sm font-semibold">✓</span> : <span className="text-gray-300 text-xs">–</span>}
                          </button>
                        </td>
                      );
                    }

                    const opt = col.statuses?.find(s => s.key === entry?.value);
                    const swatch = opt ? colorOf(opt.color) : null;
                    return (
                      <td key={col.id} className="px-4 py-3 text-center">
                        <button
                          onClick={e => openMenu(e, client.id, col.id)}
                          onMouseEnter={e => showTip(e, entry)}
                          onMouseLeave={() => setTip(null)}
                          className={`w-8 h-8 mx-auto rounded-lg border transition-all flex items-center justify-center
                            ${swatch ? `${swatch.bg} ${swatch.text} border-transparent ring-1 ${swatch.ring}` : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                          {swatch ? <span className={`w-2.5 h-2.5 rounded-full ${swatch.dot}`} /> : <span className="text-gray-300 text-xs">–</span>}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${completion(client.id)}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{completion(client.id)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onDeleteClient(client.id)}
                      className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-rose-500 transition-opacity"
                      title="Mükellefi sil"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
              {sortedClients.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 3} className="text-center text-gray-400 text-sm py-10">
                    "{search}" ile eşleşen mükellef bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Kim, ne zaman işaretledi */}
      {tip && (
        <div
          style={{ position: 'fixed', top: tip.top, left: tip.left, transform: 'translate(-50%, -100%)' }}
          className="z-50 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
        >
          {tip.text}
        </div>
      )}

      {/* Durum Seçim Menüsü */}
      {menu && menuColumn && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menu.top, left: menu.left }}
          className="z-50 bg-white shadow-xl border border-gray-100 rounded-xl p-1.5 flex flex-col gap-0.5 w-40"
        >
          {(menuColumn.statuses ?? []).map(opt => {
            const swatch = colorOf(opt.color);
            return (
              <button
                key={opt.key}
                onClick={() => pick(opt.key)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-gray-700 ${swatch.hoverBg} transition-colors`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${swatch.dot}`} />
                {opt.label}
              </button>
            );
          })}
          <div className="h-px bg-gray-100 my-1" />
          <button
            onClick={() => pick(null)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-gray-50 transition-colors"
          >
            Temizle
          </button>
        </div>
      )}
    </div>
  );
}
