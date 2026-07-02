import { useEffect, useState } from 'react';
import type { NoteUrgency, SharedNote } from './types';
import { subscribeNotes, addNoteDoc, deleteNoteDoc } from './firebase';

const URGENCY_OPTIONS: { key: NoteUrgency; label: string; dot: string; border: string; bg: string }[] = [
  { key: 'low', label: 'Düşük', dot: 'bg-emerald-500', border: 'border-emerald-400', bg: 'bg-emerald-50' },
  { key: 'medium', label: 'Orta', dot: 'bg-amber-500', border: 'border-amber-400', bg: 'bg-amber-50' },
  { key: 'high', label: 'Acil', dot: 'bg-rose-500', border: 'border-rose-400', bg: 'bg-rose-50' },
];

function urgencyOf(key: NoteUrgency) {
  return URGENCY_OPTIONS.find(o => o.key === key) ?? URGENCY_OPTIONS[0];
}

export default function SharedNotes({ currentUser }: { currentUser: string }) {
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [urgency, setUrgency] = useState<NoteUrgency>('low');

  useEffect(() => {
    const unsub = subscribeNotes(setNotes);
    return () => unsub();
  }, []);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNoteDoc(newNote.trim(), currentUser, urgency);
    setNewNote('');
    setUrgency('low');
  };

  const handleDeleteNote = (id: string) => {
    deleteNoteDoc(id);
  };

  // Notları yazan kişilere göre gruplandırarak benzersiz kişileri buluyoruz
  const uniqueUsers = Array.from(new Set(notes.map(n => n.createdBy)));

  return (
    <div className="mt-2 w-full">
      {/* Yeni Not Ekleme Çubuğu */}
      <form onSubmit={handleAddNote} className="mb-8 flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Yeni bir not ekle..."
          className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {URGENCY_OPTIONS.map(o => (
            <button
              key={o.key}
              type="button"
              onClick={() => setUrgency(o.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-colors
                ${urgency === o.key ? `${o.border} ${o.bg} text-gray-800` : 'border-transparent text-gray-400 hover:bg-gray-50'}`}
            >
              <span className={`w-2 h-2 rounded-full ${o.dot}`} />
              {o.label}
            </button>
          ))}
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-md shrink-0">
          Ekle
        </button>
      </form>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-sm">Henüz not eklenmedi.</p>
        </div>
      ) : (
        /* Kanban / Sütun Panosu */
        <div className="flex overflow-x-auto gap-6 pb-4 items-start">
          {uniqueUsers.map(user => (
            <div key={user} className="min-w-[320px] w-[320px] bg-slate-100 rounded-xl p-4 flex flex-col max-h-[70vh] border border-slate-200 shadow-sm">
              {/* Sütun Başlığı (Kişi Adı) */}
              <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between border-b border-slate-300 pb-2">
                <span className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white text-xs px-2.5 py-1 rounded-full">
                    {notes.filter(n => n.createdBy === user).length}
                  </span>
                  {user}
                </span>
              </h3>

              {/* Kişinin Not Kutucukları */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {notes.filter(n => n.createdBy === user).map(note => {
                  const u = urgencyOf(note.urgency);
                  return (
                    <div key={note.id} className={`bg-white p-4 rounded-lg shadow-sm border-2 ${u.border} group relative hover:shadow-md transition-shadow`}>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 ${u.bg} text-gray-700`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                        {u.label}
                      </span>
                      <p className="text-slate-800 text-sm font-medium">{note.content}</p>
                      <p className="text-[11px] text-slate-400 mt-3 font-mono">
                        {new Date(note.createdAt).toLocaleTimeString('tr-TR')}
                      </p>

                      {/* Sadece kendi yazdığı notları silebilme butonu */}
                      {currentUser === user && (
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs font-bold transition-opacity"
                          title="Sil"
                        >
                          ✖
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
