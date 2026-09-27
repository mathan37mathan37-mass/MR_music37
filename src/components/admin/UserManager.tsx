import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Shield, Ban, CheckCircle, Trash2, Eye,
  Clock, Heart, ListMusic, PlayCircle, X, MapPin, Mail, Calendar
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { ConfirmDialog } from './ConfirmDialog';
import type { ManagedUser } from '@/types/admin';
import { formatTimeAgo, formatNumber } from '@/utils/cn';

export function UserManager() {
  const { users, toggleUserBlock, deleteUser } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'creator' | 'listener'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

  const [inspectingUser, setInspectingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [blockingUser, setBlockingUser] = useState<ManagedUser | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesQuery && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users size={20} className="text-cyan-400" />
            User Account Management
            <span className="text-xs font-normal text-white/40">({filteredUsers.length} accounts)</span>
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            Monitor registered listeners, inspect listening activity, block fraudulent accounts
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search user name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500 w-52 sm:w-64"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all" className="bg-[#14121d]">All Roles</option>
            <option value="admin" className="bg-[#14121d]">Admin</option>
            <option value="creator" className="bg-[#14121d]">Creator</option>
            <option value="listener" className="bg-[#14121d]">Listener</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all" className="bg-[#14121d]">All Status</option>
            <option value="active" className="bg-[#14121d]">Active</option>
            <option value="blocked" className="bg-[#14121d]">Blocked</option>
          </select>
        </div>
      </div>

      {/* ── Users Table ─────────────────────────────────────────────────────── */}
      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-white/40 uppercase tracking-wider bg-white/[0.01]">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Plays</th>
                <th className="py-3.5 px-4">Liked</th>
                <th className="py-3.5 px-4">Playlists</th>
                <th className="py-3.5 px-4">Last Active</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredUsers.map((user) => {
                const isBlocked = user.status === 'blocked';

                return (
                  <tr key={user.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-white/60">
                              {user.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{user.displayName}</p>
                          <p className="text-[11px] text-white/40 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : user.role === 'creator'
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-white/5 text-white/50 border border-white/5'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        isBlocked
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isBlocked ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-white/70 font-mono tabular-nums">
                      {formatNumber(user.playsCount)}
                    </td>

                    <td className="py-3.5 px-4 text-white/70 font-mono tabular-nums">
                      {user.likedCount}
                    </td>

                    <td className="py-3.5 px-4 text-white/70 font-mono tabular-nums">
                      {user.playlistsCount}
                    </td>

                    <td className="py-3.5 px-4 text-white/40">
                      {formatTimeAgo(user.lastActive)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingUser(user)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                          title="Inspect User Activity"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => setBlockingUser(user)}
                          className={`p-2 rounded-xl transition-colors ${
                            isBlocked
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                          }`}
                          title={isBlocked ? 'Unblock User' : 'Block User'}
                        >
                          <Ban size={13} />
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── User Activity Inspector Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {inspectingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#14121d] border border-white/10 p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 border border-white/10 shadow-lg">
                    {inspectingUser.photoURL ? (
                      <img src={inspectingUser.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/50">
                        {inspectingUser.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{inspectingUser.displayName}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        {inspectingUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 font-mono mt-0.5">@{inspectingUser.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingUser(null)}
                  className="p-1.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile Details List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white/60 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <Mail size={14} className="text-cyan-400" />
                  <span>{inspectingUser.email}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <MapPin size={14} className="text-pink-400" />
                  <span>{inspectingUser.country || 'Global Listener'}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <Calendar size={14} className="text-violet-400" />
                  <span>Member since {new Date(inspectingUser.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Activity Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass p-3.5 rounded-2xl border border-white/5 text-center">
                  <PlayCircle size={16} className="mx-auto text-violet-400 mb-1" />
                  <span className="font-display text-lg font-bold text-white block">
                    {formatNumber(inspectingUser.playsCount)}
                  </span>
                  <span className="text-[10px] text-white/40 uppercase">Plays</span>
                </div>

                <div className="glass p-3.5 rounded-2xl border border-white/5 text-center">
                  <Heart size={16} className="mx-auto text-pink-400 mb-1" />
                  <span className="font-display text-lg font-bold text-white block">
                    {inspectingUser.likedCount}
                  </span>
                  <span className="text-[10px] text-white/40 uppercase">Liked Songs</span>
                </div>

                <div className="glass p-3.5 rounded-2xl border border-white/5 text-center">
                  <ListMusic size={16} className="mx-auto text-cyan-400 mb-1" />
                  <span className="font-display text-lg font-bold text-white block">
                    {inspectingUser.playlistsCount}
                  </span>
                  <span className="text-[10px] text-white/40 uppercase">Playlists</span>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/40">Account Status:</span>
                  <span className={inspectingUser.status === 'blocked' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {inspectingUser.status.toUpperCase()}
                  </span>
                </div>

                <button
                  onClick={() => {
                    toggleUserBlock(inspectingUser.id);
                    setInspectingUser(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    inspectingUser.status === 'blocked'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {inspectingUser.status === 'blocked' ? 'Unblock User' : 'Block User'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Block Confirmation Dialog ────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(blockingUser)}
        title={blockingUser?.status === 'blocked' ? 'Unblock User Account' : 'Block User Account'}
        description={
          blockingUser?.status === 'blocked'
            ? 'Restore streaming privileges and account access for this user?'
            : 'Suspends streaming access and prevents user from creating playlists or modifying library.'
        }
        itemName={blockingUser?.displayName}
        confirmLabel={blockingUser?.status === 'blocked' ? 'Unblock User' : 'Confirm Block'}
        onConfirm={() => {
          if (blockingUser) {
            toggleUserBlock(blockingUser.id);
            setBlockingUser(null);
          }
        }}
        onClose={() => setBlockingUser(null)}
      />

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        title="Delete User Account"
        description="Are you sure you want to delete this user? Their account credentials, saved playlists, and streaming records will be permanently expunged from Firestore."
        itemName={deletingUser ? `${deletingUser.displayName} (${deletingUser.email})` : undefined}
        confirmLabel="Yes, Delete User"
        onConfirm={() => {
          if (deletingUser) {
            deleteUser(deletingUser.id);
            setDeletingUser(null);
          }
        }}
        onClose={() => setDeletingUser(null)}
      />
    </div>
  );
}
