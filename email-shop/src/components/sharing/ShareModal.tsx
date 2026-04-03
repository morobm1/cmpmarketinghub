import { useState, useEffect } from 'react';
import { X, Share2, Check, Loader2, Users } from 'lucide-react';

interface ShareUser {
  username: string;
  role: string;
}

interface ShareModalProps {
  title: string;
  itemName: string;
  currentSharedWith: string[];
  onSave: (sharedWith: string[]) => void;
  onClose: () => void;
}

export function ShareModal({ title, itemName, currentSharedWith, onSave, onClose }: ShareModalProps) {
  const [users, setUsers] = useState<ShareUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSharedWith));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/.netlify/functions/email-share-users', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: ShareUser[]) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setUsers([]);
        setLoading(false);
      });
  }, []);

  const toggleUser = (username: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const handleSave = () => {
    setSaving(true);
    onSave(Array.from(selected));
  };

  const filteredUsers = search
    ? users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-[#446472]" />
            <h2 className="text-base font-semibold text-surface-800">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
            <X size={18} />
          </button>
        </div>

        {/* Item name */}
        <div className="px-6 py-3 bg-surface-50 border-b border-surface-200 shrink-0">
          <p className="text-xs text-surface-500">Sharing</p>
          <p className="text-sm font-semibold text-surface-800 truncate">{itemName}</p>
        </div>

        {/* Search */}
        <div className="px-6 pt-3 shrink-0">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#52d5ff]/40 focus:border-[#52d5ff]"
          />
        </div>

        {/* User list */}
        <div className="flex-1 overflow-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-surface-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-surface-400">
              <Users size={24} className="mb-2" />
              <p className="text-sm">{search ? 'No users match your search' : 'No other users found'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((u) => (
                <button
                  key={u.username}
                  onClick={() => toggleUser(u.username)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selected.has(u.username)
                      ? 'bg-[#446472]/10 border border-[#446472]/30'
                      : 'hover:bg-surface-50 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    selected.has(u.username)
                      ? 'bg-[#446472] text-white'
                      : 'bg-surface-200 text-surface-600'
                  }`}>
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{u.username}</p>
                    <p className="text-[10px] text-surface-400 capitalize">{u.role}</p>
                  </div>
                  {selected.has(u.username) && (
                    <Check size={16} className="text-[#446472] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 shrink-0 bg-surface-50">
          <p className="text-xs text-surface-500">
            {selected.size} user{selected.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#446472] rounded-lg hover:bg-[#365059] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save Sharing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
