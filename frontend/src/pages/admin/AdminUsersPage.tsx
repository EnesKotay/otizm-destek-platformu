import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import {
  Users,
  Search,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  FileText,
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Activity,
  CheckSquare,
  Square
} from 'lucide-react';
import { adminService, type UserActivitySummary } from '@/services/adminService';
import { toast } from '@/store/toastStore';
import type { User } from '@/types';
import { formatDate, formatRelative } from '@/utils/date';

export function AdminUsersPage() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [usersRole, setUsersRole] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk operation states
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Drawer state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activitySummary, setActivitySummary] = useState<UserActivitySummary | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!selectedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivitySummary(null);
      return;
    }
    let cancelled = false;
    setActivityLoading(true);
    adminService.getUserActivitySummary(selectedUser.id)
      .then(summary => { if (!cancelled) setActivitySummary(summary); })
      .catch(() => { if (!cancelled) setActivitySummary(null); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  const handleSearchChange = (value: string) => {
    setUsersSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(value); setPage(0); }, 300);
  };

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await adminService.getAllUsers(page, 50, debouncedSearch, usersRole);
      setUsersList(response.content);
      setTotalPages(response.totalPages);
    } catch {
      setUsersList([]);
    } finally {
      setUsersLoading(false);
    }
  }, [page, debouncedSearch, usersRole]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0);
     
    setSelectedUserIds([]);
  }, [debouncedSearch, usersRole]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const handleToggleUserStatus = async (userId: string) => {
    setActionLoading(`${userId}-toggle`);
    try {
      const updated = await adminService.toggleUserStatus(userId);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, isActive: updated.isActive } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, isActive: updated.isActive } : null);
      }
      toast.success(updated.isActive ? 'Kullanıcı engeli kaldırıldı' : 'Kullanıcı engellendi');
    } catch {
      toast.error('İşlem gerçekleştirilemedi.');
    } finally {
      setActionLoading(null);
    }
  };
  const handleChangeRole = async (userId: string, newRole: string) => {
    setActionLoading(`${userId}-role`);
    try {
      const updated = await adminService.changeUserRole(userId, newRole);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: updated.role } : null);
      }
      toast.success(`Kullanıcı rolü ${newRole} olarak güncellendi.`);
    } catch {
      toast.error('Rol değiştirilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendPasswordReset = async (userId: string) => {
    setActionLoading(`${userId}-reset`);
    try {
      await adminService.sendPasswordResetEmail(userId);
      toast.success('Şifre sıfırlama e-postası başarıyla gönderildi.');
    } catch {
      toast.error('E-posta gönderilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkToggleStatus = async () => {
    if (selectedUserIds.length === 0) return;
    setActionLoading('bulk-toggle');
    try {
      const res = await adminService.bulkToggleUserStatus(selectedUserIds);
      toast.success(`${res.updated} kullanıcının durumu güncellendi.`);
      setSelectedUserIds([]);
      loadUsers();
    } catch {
      toast.error('Toplu işlem gerçekleştirilemedi.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === usersList.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(usersList.map(u => u.id));
    }
  };

  const handleSelectRow = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Drawer'ın açılmasını engelle
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await adminService.exportUsers(usersRole);
      toast.success('CSV dışa aktarıldı');
    } catch {
      toast.error('Dışa aktarma başarısız.');
    } finally {
      setExportLoading(false);
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">Yönetici</span>;
      case 'EXPERT': return <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">Uzman</span>;
      default: return <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">Ebeveyn</span>;
    }
  };

  return (
    <>
      <Card className="rounded-[28px] border-slate-200 relative overflow-hidden">
        {/* Bulk Action Panel - Sticky at top of table if selections exist */}
        {selectedUserIds.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-white text-[11px] font-extrabold shadow-sm">
                {selectedUserIds.length}
              </span>
              <span className="text-sm font-bold text-indigo-950">Kullanıcı Seçildi</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 h-9 rounded-xl text-xs font-bold"
                onClick={() => setSelectedUserIds([])}
              >
                Seçimi Temizle
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 rounded-xl text-xs font-bold flex items-center gap-1.5"
                onClick={handleBulkToggleStatus}
                disabled={actionLoading !== null}
                loading={actionLoading === 'bulk-toggle'}
              >
                <ShieldAlert size={14} />
                Durumu Değiştir (Aktif/Ban)
              </Button>
            </div>
          </div>
        )}

        <CardHeader className="border-b border-slate-100 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-slate-600" size={24} />
              <CardTitle>Kullanıcı CRM & Yönetimi</CardTitle>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="İsim veya E-posta..."
                  value={usersSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-10 w-full min-w-[200px] rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <select
                value={usersRole}
                onChange={(e) => setUsersRole(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition-colors focus:border-indigo-500 focus:bg-white"
              >
                <option value="ALL">Tüm Roller</option>
                <option value="PARENT">Ebeveynler</option>
                <option value="EXPERT">Uzmanlar</option>
                <option value="ADMIN">Yöneticiler</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exportLoading}
                loading={exportLoading}
                className="h-10 gap-1.5 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <Download size={15} />
                Dışa Aktar (CSV)
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <div className="p-0">
          {usersLoading ? (
            <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
          ) : usersList.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Kullanıcı bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Select All Row */}
              <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100 text-slate-500 text-xs font-bold">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {selectedUserIds.length === usersList.length ? (
                      <CheckSquare size={18} className="text-indigo-600" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                  <span>Tümünü Seç / Temizle</span>
                </div>
                <span>({usersList.length} kullanıcı gösteriliyor)</span>
              </div>

              {usersList.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div 
                    key={u.id} 
                    onClick={() => setSelectedUser(u)}
                    className={`flex items-center justify-between p-4 transition-colors hover:bg-slate-50 cursor-pointer ${!u.isActive ? 'opacity-65 bg-red-50/10' : ''} ${isSelected ? 'bg-indigo-50/20' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => handleSelectRow(u.id, e)}
                        className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-indigo-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>

                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${u.role === 'ADMIN' ? 'bg-amber-500' : u.role === 'EXPERT' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                        {u.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-1.5">
                          <span className="truncate">{u.fullName || 'İsimsiz Kullanıcı'}</span>
                          {!u.isActive && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-extrabold text-red-700 uppercase">ENGELlİ</span>}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{u.email} • Kayıt: {formatDate(u.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      {renderRoleBadge(u.role)}
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg hidden sm:flex font-bold text-xs">
                        CRM Kartı
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <span className="text-xs text-slate-500">
                Sayfa {page + 1} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* User Details Drawer */}
      <Drawer
        isOpen={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
        title={
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${selectedUser?.role === 'ADMIN' ? 'bg-amber-500' : selectedUser?.role === 'EXPERT' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
              {selectedUser?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{selectedUser?.fullName}</h2>
              <p className="text-xs text-slate-400 font-medium truncate">ID: {selectedUser?.id}</p>
            </div>
          </div>
        }
        size="md"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex flex-wrap gap-1.5">
                {renderRoleBadge(selectedUser.role)}
                {selectedUser.verified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    <CheckCircle2 size={12} /> Doğrulanmış
                  </span>
                )}
                {!selectedUser.isActive && (
                   <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold border border-red-200">YASAKLI</span>
                )}
              </div>
              
              {selectedUser.role !== 'ADMIN' && (
                <Button
                  variant={selectedUser.isActive ? "outline" : "primary"}
                  size="sm"
                  className={selectedUser.isActive ? "text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 rounded-xl" : "bg-emerald-600 hover:bg-emerald-700 rounded-xl"}
                  onClick={() => handleToggleUserStatus(selectedUser.id)}
                  disabled={actionLoading !== null}
                  loading={actionLoading === `${selectedUser.id}-toggle`}
                >
                  {selectedUser.isActive ? 'Hesabı Engelle' : 'Engeli Kaldır'}
                </Button>
              )}
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">E-Posta Adresi</p>
                      <p className="font-semibold text-slate-900">{selectedUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">Kayıt Tarihi</p>
                      <p className="font-semibold text-slate-900">{formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>

                  {selectedUser.city && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400">Konum</p>
                        <p className="font-semibold text-slate-900">{selectedUser.city}</p>
                      </div>
                    </div>
                  )}

                  {selectedUser.role === 'EXPERT' && (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <Briefcase size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Uzmanlık Alanı</p>
                          <p className="font-semibold text-slate-900">{selectedUser.expertTitle || 'Belirtilmemiş'}</p>
                        </div>
                      </div>
                      {selectedUser.institution && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <FileText size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">Kurum</p>
                            <p className="font-semibold text-slate-900">{selectedUser.institution}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Gerçek Aktivite Özeti (backend'den) */}
              <Card className="rounded-2xl border-none shadow-sm bg-slate-50/50">
                <CardContent className="p-5 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Activity size={14} /> Sistem Aktivite Özeti
                  </h4>

                  {activityLoading ? (
                    <p className="text-xs text-slate-400 font-medium">Yükleniyor...</p>
                  ) : activitySummary ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-lg font-black text-indigo-600">{activitySummary.trackedActionsCount}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Kayıtlı İşlem</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-lg font-black text-emerald-600">
                            {selectedUser.role === 'PARENT' ? (activitySummary.childrenCount ?? 0) : (activitySummary.appointmentsCount ?? 0)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">{selectedUser.role === 'PARENT' ? 'Çocuk' : 'Randevu'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <p className="text-lg font-black text-amber-600">{activitySummary.forumPostsCount}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Forum</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Son İşlem Günlüğü</p>
                        {activitySummary.recentActions.length === 0 ? (
                          <p className="text-xs text-slate-400 bg-white p-2.5 rounded-lg border border-slate-100">Henüz kayıtlı işlem yok.</p>
                        ) : (
                          <div className="space-y-2 text-xs">
                            {activitySummary.recentActions.map(entry => (
                              <div key={entry.id} className="flex justify-between items-center text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                                <span className="font-semibold">{entry.action}</span>
                                <span className="text-[10px] text-slate-400">{formatRelative(entry.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">Aktivite özeti yüklenemedi.</p>
                  )}
                </CardContent>
              </Card>

              {/* Yönetici Hızlı İşlemleri (Rol & Şifre Sıfırlama) */}
              <Card className="rounded-2xl border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">Yönetici Aksiyonları</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kullanıcı Rolü</label>
                    <select
                      value={selectedUser.role}
                      onChange={(e) => handleChangeRole(selectedUser.id, e.target.value)}
                      disabled={actionLoading !== null}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="PARENT">Ebeveyn (PARENT)</option>
                      <option value="EXPERT">Uzman (EXPERT)</option>
                      <option value="TEACHER">Eğitmen (TEACHER)</option>
                      <option value="ADMIN">Yönetici (ADMIN)</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendPasswordReset(selectedUser.id)}
                      disabled={actionLoading !== null}
                      className="w-full text-xs font-bold border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50"
                    >
                      <Mail size={14} className="mr-1.5" /> Şifre Sıfırla E-postası
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
