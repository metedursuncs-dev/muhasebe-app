import { useEffect, useMemo, useState } from 'react';
import TrackingGrid from './TrackingGrid';
import SharedNotes from './SharedNotes';
import Login from './Login';
import type { Client, TaskColumn, CellEntry, ColumnType } from './types';
import { COLOR_PALETTE, colorOf } from './types';
import {
  type AppUser,
  subscribeClients,
  subscribeColumns,
  subscribeCellData,
  addClientDoc,
  addColumnDoc,
  deleteClientDoc,
  deleteColumnDoc,
  setCellValue,
} from './firebase';

const SESSION_KEY = 'muhasebe_session_user';

function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function monthLabel(date: Date) {
  const label = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthKeyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const NAV_ITEMS = [
  { key: 'grid' as const, label: 'Ana Takip', icon: GridIcon },
  { key: 'notes' as const, label: 'Ortak Notlar', icon: NotesIcon },
];

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3.5" y="4" width="17" height="16" rx="2" strokeWidth={1.75} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.5 10h17M9.5 10v10" />
    </svg>
  );
}

function NotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.4 3.6a1.9 1.9 0 012.7 2.7L12 15.4l-3.6.9.9-3.6 9.1-9.1z" />
    </svg>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(loadSession);

  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={user => {
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
          setCurrentUser(user);
        }}
      />
    );
  }

  return <MainApp currentUser={currentUser} onLogout={() => { localStorage.removeItem(SESSION_KEY); setCurrentUser(null); }} />;
}

function MainApp({ currentUser, onLogout }: { currentUser: AppUser; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'grid' | 'notes'>('grid');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [modal, setModal] = useState<'client' | 'column' | null>(null);
  const [monthDate, setMonthDate] = useState(() => new Date());

  const [clients, setClients] = useState<Client[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [cellData, setCellData] = useState<Record<string, CellEntry>>({});
  const [loadingData, setLoadingData] = useState(true);

  const monthKey = useMemo(() => monthKeyOf(monthDate), [monthDate]);

  useEffect(() => {
    let clientsLoaded = false;
    let columnsLoaded = false;
    const checkLoaded = () => {
      if (clientsLoaded && columnsLoaded) setLoadingData(false);
    };
    const unsubClients = subscribeClients(list => {
      setClients(list);
      clientsLoaded = true;
      checkLoaded();
    });
    const unsubColumns = subscribeColumns(list => {
      setColumns(list);
      columnsLoaded = true;
      checkLoaded();
    });
    return () => {
      unsubClients();
      unsubColumns();
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeCellData(monthKey, setCellData);
    return () => unsub();
  }, [monthKey]);

  const goToPrevMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goToNextMonth = () => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleCellChange = (clientId: string, columnId: string, value: string | null) => {
    setCellValue(clientId, columnId, monthKey, value, currentUser.displayName);
  };

  const handleAddClient = (companyCode: string, name: string) => {
    if (clients.some(c => c.companyCode === companyCode)) {
      alert(`"${companyCode}" numarası zaten kullanılıyor. Başka bir numara girin.`);
      return;
    }
    addClientDoc(companyCode, name);
    setModal(null);
  };

  const handleAddColumn = (title: string, type: ColumnType, statuses?: { label: string; color: string }[]) => {
    const statusOptions = (statuses ?? []).map((s, i) => ({ key: `s${i}-${Date.now()}`, label: s.label, color: s.color }));
    addColumnDoc(title, type, columns.length, statusOptions);
    setModal(null);
  };

  const handleDeleteClient = (clientId: string) => {
    if (!confirm('Bu mükellef listeden kaldırmak istediğinize emin misiniz?')) return;
    deleteClientDoc(clientId);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (!confirm('Bu sütunu silmek istediğinize emin misiniz?')) return;
    deleteColumnDoc(columnId);
  };

  return (
    <div className="flex h-screen bg-[#F4F5F7]">
      {/* Sol Menü */}
      <aside className="w-64 bg-[#1B1B2A] text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-sm">OP</div>
          <h2 className="text-lg font-bold tracking-tight">Ofis Paneli</h2>
        </div>

        <nav className="space-y-1.5 flex-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {currentUser.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{currentUser.displayName}</p>
            <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
          </div>
          <button onClick={onLogout} title="Çıkış Yap" className="text-slate-500 hover:text-white transition-colors shrink-0">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Ana İçerik */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {activeTab === 'grid' ? 'Muhasebe Takibi' : 'Ortak Notlar'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'grid'
                ? `${clients.length} mükellef · ${columns.length} kalem`
                : 'Ekip içi paylaşılan hatırlatmalar'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'grid' && (
              <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
                <button
                  onClick={goToPrevMonth}
                  title="Önceki ay"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="px-2 text-sm font-medium text-gray-700 min-w-[128px] text-center select-none">
                  {monthLabel(monthDate)}
                </span>
                <button
                  onClick={goToNextMonth}
                  title="Sonraki ay"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {activeTab === 'grid' && (
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(v => !v)}
                  className="bg-indigo-600 text-white w-10 h-10 rounded-full text-2xl leading-none shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  +
                </button>
                {showAddMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                    <div className="absolute right-0 mt-2 bg-white shadow-xl border border-gray-100 rounded-xl p-1.5 w-44 z-20">
                      <button
                        onClick={() => { setModal('client'); setShowAddMenu(false); }}
                        className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Mükellef Ekle
                      </button>
                      <button
                        onClick={() => { setModal('column'); setShowAddMenu(false); }}
                        className="block w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sütun Ekle
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'grid' ? (
          loadingData ? (
            <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Veriler yükleniyor...</div>
          ) : (
            <TrackingGrid
              clients={clients}
              columns={columns}
              cellData={cellData}
              onCellChange={handleCellChange}
              onDeleteClient={handleDeleteClient}
              onDeleteColumn={handleDeleteColumn}
            />
          )
        ) : (
          <SharedNotes currentUser={currentUser.displayName} />
        )}
      </main>

      {modal === 'client' && (
        <AddClientModal onClose={() => setModal(null)} onSubmit={handleAddClient} />
      )}
      {modal === 'column' && (
        <AddColumnModal onClose={() => setModal(null)} onSubmit={handleAddColumn} />
      )}
    </div>
  );
}

function AddClientModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (companyCode: string, name: string) => void }) {
  const [companyCode, setCompanyCode] = useState('');
  const [name, setName] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode.trim() || !name.trim()) return;
    onSubmit(companyCode.trim(), name.trim());
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Yeni Mükellef Ekle</h3>

        <label className="block text-xs font-medium text-gray-500 mb-1.5">Mükellef Numarası</label>
        <input
          autoFocus
          value={companyCode}
          onChange={e => setCompanyCode(e.target.value)}
          placeholder="Örn. 0206"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
        />

        <label className="block text-xs font-medium text-gray-500 mt-4 mb-1.5">Mükellef Adı</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Örn. Kaan Elektronik Ltd. Şti."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
        />
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Vazgeç
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">
            Ekle
          </button>
        </div>
      </form>
    </div>
  );
}

function nextColorName(name: string) {
  const idx = COLOR_PALETTE.findIndex(c => c.name === name);
  return COLOR_PALETTE[(idx + 1) % COLOR_PALETTE.length].name;
}

function AddColumnModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string, type: ColumnType, statuses?: { label: string; color: string }[]) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ColumnType>('status');
  const [statuses, setStatuses] = useState<{ label: string; color: string }[]>([
    { label: 'Gelmedi', color: 'rose' },
    { label: 'Geldi', color: 'amber' },
    { label: 'İşlendi', color: 'emerald' },
  ]);

  const updateStatus = (idx: number, patch: Partial<{ label: string; color: string }>) => {
    setStatuses(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addStatus = () => {
    const used = statuses.map(s => s.color);
    const color = COLOR_PALETTE.find(c => !used.includes(c.name))?.name ?? 'slate';
    setStatuses(prev => [...prev, { label: '', color }]);
  };

  const removeStatus = (idx: number) => {
    setStatuses(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === 'status') {
      const clean = statuses.map(s => ({ ...s, label: s.label.trim() })).filter(s => s.label);
      if (clean.length === 0) return;
      onSubmit(title.trim(), type, clean);
    } else {
      onSubmit(title.trim(), type);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Yeni Sütun Ekle</h3>

        <label className="block text-xs font-medium text-gray-500 mb-1.5">Sütun Adı</label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Örn. Damga Vergisi"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
        />

        <label className="block text-xs font-medium text-gray-500 mt-4 mb-1.5">Sütun Tipi</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('checkbox')}
            className={`text-left p-3 rounded-lg border-2 transition-colors ${type === 'checkbox' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <span className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center text-xs font-semibold mb-2">✓</span>
            <p className="text-sm font-semibold text-gray-800">Tik</p>
            <p className="text-xs text-gray-500 mt-0.5">Evet / Hayır</p>
          </button>
          <button
            type="button"
            onClick={() => setType('status')}
            className={`text-left p-3 rounded-lg border-2 transition-colors ${type === 'status' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <span className="flex gap-1 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-0.5" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-0.5" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-0.5" />
            </span>
            <p className="text-sm font-semibold text-gray-800">Çoklu Durum</p>
            <p className="text-xs text-gray-500 mt-0.5">Kendi durumlarını tanımla</p>
          </button>
        </div>

        {type === 'status' && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Durumlar</label>
            <div className="space-y-2">
              {statuses.map((s, idx) => {
                const swatch = colorOf(s.color);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(idx, { color: nextColorName(s.color) })}
                      title="Rengi değiştir"
                      className={`w-8 h-8 rounded-md ${swatch.dot} shrink-0 ring-2 ring-offset-1 ring-transparent hover:ring-gray-300 transition-all`}
                    />
                    <input
                      value={s.label}
                      onChange={e => updateStatus(idx, { label: e.target.value })}
                      placeholder={`Durum ${idx + 1}`}
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                    {statuses.length > 1 && (
                      <button type="button" onClick={() => removeStatus(idx)} className="text-gray-300 hover:text-rose-500 text-sm px-1 shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addStatus} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              + Durum Ekle
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Vazgeç
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">
            Ekle
          </button>
        </div>
      </form>
    </div>
  );
}
