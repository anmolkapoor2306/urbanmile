'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  CheckCircle2,
  Edit3,
  KeyRound,
  Mail,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UserX,
  X,
} from 'lucide-react';
import type { AdminRole, AdminUserStatus } from '@prisma/client';
import type { SerializedAdminUser } from '@/lib/adminUsers';
import { getAdminRoleLabel, getAdminStatusLabel } from '@/lib/adminUsers';
import { cn } from '@/lib/utils';

const roleOptions: Array<{ value: AdminRole | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DISPATCHER', label: 'Dispatcher' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'VIEWER', label: 'Viewer' },
];

const editableRoleOptions = roleOptions.filter((option): option is { value: AdminRole; label: string } => option.value !== 'ALL');

const statusOptions: Array<{ value: AdminUserStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

type AddAdminForm = {
  name: string;
  email: string;
  username: string;
  role: AdminRole;
  status: AdminUserStatus;
  password: string;
  confirmPassword: string;
};

type EditAdminForm = {
  id: string;
  name: string;
  role: AdminRole;
  status: AdminUserStatus;
  phone: string;
};

type ResetPasswordForm = {
  id: string;
  name: string;
  role: string;
  password: string;
  confirmPassword: string;
};

const emptyAddForm: AddAdminForm = {
  name: '',
  email: '',
  username: '',
  role: 'VIEWER',
  status: 'ACTIVE',
  password: '',
  confirmPassword: '',
};

export function AdminManagementClient({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: SerializedAdminUser[];
  currentUserId: string;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminRole | 'ALL'>('ALL');
  const [addForm, setAddForm] = useState<AddAdminForm | null>(null);
  const [editForm, setEditForm] = useState<EditAdminForm | null>(null);
  const [resetForm, setResetForm] = useState<ResetPasswordForm | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingAction, setSavingAction] = useState<string | null>(null);

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();

    return admins.filter((admin) => {
      const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter;
      const matchesSearch =
        query.length === 0 ||
        admin.name.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query) ||
        admin.username.toLowerCase().includes(query);

      return matchesRole && matchesSearch;
    });
  }, [admins, roleFilter, search]);

  const stats = useMemo(() => {
    return {
      total: admins.length,
      active: admins.filter((admin) => admin.status === 'ACTIVE').length,
      pending: admins.filter((admin) => admin.status === 'PENDING').length,
      inactive: admins.filter((admin) => admin.status === 'INACTIVE' || !admin.isActive).length,
    };
  }, [admins]);

  async function refreshAdmins() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not refresh admin users.');
      setAdmins(payload.data);
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function showSuccess(text: string) {
    setMessage({ tone: 'success', text });
  }

  function showError(text: string) {
    setMessage({ tone: 'error', text });
  }

  function openEdit(admin: SerializedAdminUser) {
    setMessage(null);
    setEditForm({
      id: admin.id,
      name: admin.name,
      role: admin.role as AdminRole,
      status: admin.status as AdminUserStatus,
      phone: admin.phone ?? '',
    });
  }

  function openResetPassword(admin: SerializedAdminUser) {
    setMessage(null);
    setResetForm({
      id: admin.id,
      name: admin.name,
      role: admin.role,
      password: '',
      confirmPassword: '',
    });
  }

  async function createAdmin() {
    if (!addForm) return;

    const validationError = validateAddForm(addForm, admins);
    if (validationError) {
      showError(validationError);
      return;
    }

    setSavingAction('create');
    setMessage(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not create admin user.');

      setAdmins((current) => [payload.data, ...current]);
      setAddForm(null);
      showSuccess(payload.message || 'Admin user created.');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setSavingAction(null);
    }
  }

  async function updateAdmin() {
    if (!editForm) return;

    const validationError = validateEditForm(editForm);
    if (validationError) {
      showError(validationError);
      return;
    }

    setSavingAction(`edit:${editForm.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update admin user.');

      setAdmins((current) => current.map((admin) => (admin.id === payload.data.id ? payload.data : admin)));
      setEditForm(null);
      showSuccess(payload.message || 'Admin user updated.');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setSavingAction(null);
    }
  }

  async function resetAdminPassword() {
    if (!resetForm) return;

    const validationError = validateResetPasswordForm(resetForm);
    if (validationError) {
      showError(validationError);
      return;
    }

    setSavingAction(`password:${resetForm.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${resetForm.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetForm.password,
          confirmPassword: resetForm.confirmPassword,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not reset admin password.');

      setResetForm(null);
      showSuccess(payload.message || 'Admin password reset.');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setSavingAction(null);
    }
  }

  async function toggleAdminStatus(admin: SerializedAdminUser) {
    if (admin.id === currentUserId) {
      showError('You cannot deactivate your own account.');
      return;
    }

    const nextStatus: AdminUserStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSavingAction(`toggle:${admin.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update admin status.');

      setAdmins((current) => current.map((item) => (item.id === payload.data.id ? payload.data : item)));
      showSuccess(nextStatus === 'ACTIVE' ? 'Admin activated.' : 'Admin deactivated.');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setSavingAction(null);
    }
  }

  async function deleteAdmin(admin: SerializedAdminUser) {
    if (admin.id === currentUserId) {
      showError('You cannot delete your own account.');
      return;
    }

    if (!confirm(`Remove ${admin.name} from admin users?`)) return;

    setSavingAction(`delete:${admin.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${admin.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not remove admin user.');

      setAdmins((current) => current.filter((item) => item.id !== admin.id));
      showSuccess(payload.message || 'Admin user removed.');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setSavingAction(null);
    }
  }

  async function resendInvite(admin: SerializedAdminUser) {
    setSavingAction(`resend:${admin.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${admin.id}/resend`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not resend invitation.');
      showSuccess(payload.message || 'Invite ready to resend.');
    } catch (error) {
      showError((error as Error).message);
    } finally {
      setSavingAction(null);
    }
  }

  function exportCsv() {
    const rows = filteredAdmins.map((admin) => ({
      name: admin.name,
      email: admin.email,
      role: getAdminRoleLabel(admin.role),
      status: getAdminStatusLabel(admin.status),
      lastActive: admin.lastActive ? formatDateTime(admin.lastActive) : 'Never',
      addedOn: formatDate(admin.addedOn),
    }));

    const csv = [
      ['name', 'email', 'role', 'status', 'lastActive', 'addedOn'],
      ...rows.map((row) => [row.name, row.email, row.role, row.status, row.lastActive, row.addedOn]),
    ].map((row) => row.map(escapeCsvValue).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'urbanmiles-admin-users.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
        <div className="shrink-0 border-b border-zinc-800 px-5 py-5 sm:px-6 lg:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                <Link href="/admin/settings" className="transition-colors hover:text-zinc-300">Settings</Link>
                <span>&gt;</span>
                <span className="text-zinc-300">Admin Management</span>
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Admin Management</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Add, edit, or remove admin users and manage their roles &amp; permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setAddForm(emptyAddForm);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Admin
            </button>
          </div>
        </div>

        <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6">
          {message ? (
            <div
              className={cn(
                'mb-4 rounded-lg border px-4 py-3 text-sm font-semibold',
                message.tone === 'success'
                  ? 'border-emerald-800 bg-emerald-950 text-emerald-200'
                  : 'border-red-800 bg-red-950 text-red-200'
              )}
            >
              {message.text}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Admins" value={stats.total} icon={ShieldCheck} />
            <StatCard label="Active Admins" value={stats.active} icon={CheckCircle2} />
            <StatCard label="Pending Invitations" value={stats.pending} icon={Mail} />
            <StatCard label="Inactive Admins" value={stats.inactive} icon={UserX} />
          </div>

          <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="relative min-w-0">
                  <span className="sr-only">Search admins</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search admins by name or email"
                    className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as AdminRole | 'ALL')}
                  className="h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100 focus:border-amber-500 focus:outline-none"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void refreshAdmins()}
                  disabled={isLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed"
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                >
                  <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <section className="mt-5 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-white">Admin Users</h2>
                  <p className="mt-1 text-sm text-zinc-500">{filteredAdmins.length} user{filteredAdmins.length === 1 ? '' : 's'} shown</p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <TableSkeleton />
            ) : filteredAdmins.length === 0 ? (
              <EmptyState message={admins.length === 0 ? 'No admins exist yet.' : 'No admins found'} />
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                    <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <HeaderCell>Admin</HeaderCell>
                        <HeaderCell>Role</HeaderCell>
                        <HeaderCell>Status</HeaderCell>
                        <HeaderCell>Last Active</HeaderCell>
                        <HeaderCell>Added On</HeaderCell>
                        <HeaderCell>Actions</HeaderCell>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {filteredAdmins.map((admin) => (
                        <AdminTableRow
                          key={admin.id}
                          admin={admin}
                          currentUserId={currentUserId}
                          savingAction={savingAction}
                          onEdit={openEdit}
                          onResetPassword={openResetPassword}
                          onToggleStatus={toggleAdminStatus}
                          onDelete={deleteAdmin}
                          onResend={resendInvite}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 p-4 lg:hidden">
                  {filteredAdmins.map((admin) => (
                    <AdminMobileCard
                      key={admin.id}
                      admin={admin}
                      currentUserId={currentUserId}
                      savingAction={savingAction}
                      onEdit={openEdit}
                      onResetPassword={openResetPassword}
                      onToggleStatus={toggleAdminStatus}
                      onDelete={deleteAdmin}
                      onResend={resendInvite}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </section>

      {addForm ? (
        <AdminFormModal
          title="Add Admin"
          description="Create an admin login with a temporary password."
          onClose={() => setAddForm(null)}
          footer={
            <ModalFooter
              submitLabel="Create Admin"
              isSaving={savingAction === 'create'}
              onCancel={() => setAddForm(null)}
              onSubmit={createAdmin}
            />
          }
        >
          <Field label="Name" value={addForm.name} onChange={(value) => setAddForm({ ...addForm, name: value })} />
          <Field label="Email" type="email" value={addForm.email} onChange={(value) => setAddForm({ ...addForm, email: value })} />
          <Field label="Username" value={addForm.username} onChange={(value) => setAddForm({ ...addForm, username: value })} />
          <RoleField value={addForm.role} onChange={(value) => setAddForm({ ...addForm, role: value })} />
          <StatusField value={addForm.status} onChange={(value) => setAddForm({ ...addForm, status: value })} />
          <Field label="Temporary Password" type="password" value={addForm.password} onChange={(value) => setAddForm({ ...addForm, password: value })} />
          <Field label="Confirm Temporary Password" type="password" value={addForm.confirmPassword} onChange={(value) => setAddForm({ ...addForm, confirmPassword: value })} />
        </AdminFormModal>
      ) : null}

      {editForm ? (
        <AdminFormModal
          title="Edit Admin"
          description="Update admin profile, status, and role assignment."
          onClose={() => setEditForm(null)}
          footer={
            <ModalFooter
              submitLabel="Save Changes"
              isSaving={savingAction === `edit:${editForm.id}`}
              onCancel={() => setEditForm(null)}
              onSubmit={updateAdmin}
            />
          }
        >
          <Field label="Name" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} />
          <RoleField value={editForm.role} onChange={(value) => setEditForm({ ...editForm, role: value })} />
          <StatusField value={editForm.status} onChange={(value) => setEditForm({ ...editForm, status: value })} />
          <Field label="Phone" value={editForm.phone} onChange={(value) => setEditForm({ ...editForm, phone: value })} placeholder="Optional" />
        </AdminFormModal>
      ) : null}

      {resetForm ? (
        <AdminFormModal
          title="Reset Password"
          description={`Set a new password for ${resetForm.name}. Existing sessions for this admin will be signed out.`}
          onClose={() => setResetForm(null)}
          footer={
            <ModalFooter
              submitLabel="Reset Password"
              isSaving={savingAction === `password:${resetForm.id}`}
              onCancel={() => setResetForm(null)}
              onSubmit={resetAdminPassword}
            />
          }
        >
          <Field label="New Password" type="password" value={resetForm.password} onChange={(value) => setResetForm({ ...resetForm, password: value })} />
          <Field label="Confirm New Password" type="password" value={resetForm.confirmPassword} onChange={(value) => setResetForm({ ...resetForm, confirmPassword: value })} />
        </AdminFormModal>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof ShieldCheck }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</div>
          <div className="mt-2 text-3xl font-black text-white">{value}</div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-amber-400">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: string }) {
  return <th className="px-5 py-3 font-black">{children}</th>;
}

function AdminTableRow({
  admin,
  currentUserId,
  savingAction,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
  onResend,
}: AdminActionsProps) {
  return (
    <tr className="bg-zinc-900 text-zinc-200">
      <td className="px-5 py-4">
        <AdminIdentity admin={admin} />
      </td>
      <td className="px-5 py-4">
        <RoleBadge role={admin.role} />
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={admin.status} />
      </td>
      <td className="px-5 py-4 text-zinc-400">{admin.lastActive ? formatDateTime(admin.lastActive) : 'Never'}</td>
      <td className="px-5 py-4 text-zinc-400">{formatDate(admin.addedOn)}</td>
      <td className="px-5 py-4">
        <ActionRow
          admin={admin}
          currentUserId={currentUserId}
          savingAction={savingAction}
          onEdit={onEdit}
          onResetPassword={onResetPassword}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onResend={onResend}
        />
      </td>
    </tr>
  );
}

function AdminMobileCard(props: AdminActionsProps) {
  const { admin } = props;

  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <AdminIdentity admin={admin} />
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <MobileDetail label="Role"><RoleBadge role={admin.role} /></MobileDetail>
        <MobileDetail label="Status"><StatusBadge status={admin.status} /></MobileDetail>
        <MobileDetail label="Last Active">{admin.lastActive ? formatDateTime(admin.lastActive) : 'Never'}</MobileDetail>
        <MobileDetail label="Added On">{formatDate(admin.addedOn)}</MobileDetail>
      </div>
      <div className="mt-4">
        <ActionRow {...props} />
      </div>
    </article>
  );
}

type AdminActionsProps = {
  admin: SerializedAdminUser;
  currentUserId: string;
  savingAction: string | null;
  onEdit: (admin: SerializedAdminUser) => void;
  onResetPassword: (admin: SerializedAdminUser) => void;
  onToggleStatus: (admin: SerializedAdminUser) => void;
  onDelete: (admin: SerializedAdminUser) => void;
  onResend: (admin: SerializedAdminUser) => void;
};

function ActionRow({
  admin,
  currentUserId,
  savingAction,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
  onResend,
}: AdminActionsProps) {
  const isCurrentUser = admin.id === currentUserId;
  const isBusy = savingAction?.endsWith(admin.id) ?? false;

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton label="Edit" icon={Edit3} disabled={isBusy} onClick={() => onEdit(admin)} />
      <ActionButton label="Reset Password" icon={KeyRound} disabled={isBusy} onClick={() => onResetPassword(admin)} />
      {admin.status === 'PENDING' ? (
        <ActionButton label="Resend" icon={Mail} disabled={isBusy} onClick={() => onResend(admin)} />
      ) : (
        <ActionButton
          label={admin.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          icon={admin.status === 'ACTIVE' ? UserX : CheckCircle2}
          disabled={isBusy || isCurrentUser}
          onClick={() => onToggleStatus(admin)}
        />
      )}
      <ActionButton
        label="Delete"
        icon={Trash2}
        tone="danger"
        disabled={isBusy || isCurrentUser}
        onClick={() => onDelete(admin)}
      />
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  tone = 'default',
}: {
  label: string;
  icon: typeof Edit3;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed',
        tone === 'danger'
          ? 'border-red-800 bg-red-950 text-red-200 hover:bg-red-900'
          : 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800'
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function AdminIdentity({ admin }: { admin: SerializedAdminUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-black text-white">
        {getInitials(admin.name)}
      </div>
      <div className="min-w-0">
        <div className="truncate font-black text-white">{admin.name}</div>
        <div className="truncate text-sm text-zinc-500">{admin.email}</div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-md border border-amber-800 bg-amber-950 px-2.5 py-1 text-xs font-black text-amber-200">
      {getAdminRoleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'ACTIVE'
      ? 'border-emerald-800 bg-emerald-950 text-emerald-200'
      : status === 'PENDING'
        ? 'border-sky-800 bg-sky-950 text-sky-200'
        : 'border-zinc-700 bg-zinc-950 text-zinc-300';

  return (
    <span className={cn('inline-flex rounded-md border px-2.5 py-1 text-xs font-black', className)}>
      {getAdminStatusLabel(status)}
    </span>
  );
}

function MobileDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-zinc-300">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950 px-4 py-10 text-center">
        <UserRound className="mx-auto h-8 w-8 text-zinc-500" aria-hidden="true" />
        <div className="mt-3 text-sm font-bold text-zinc-300">{message}</div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 rounded-lg border border-zinc-800 bg-zinc-950" />
      ))}
    </div>
  );
}

function AdminFormModal({
  title,
  description,
  children,
  footer,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950 p-4">
      <section className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-2">{children}</div>
        <div className="border-t border-zinc-800 px-5 py-4">{footer}</div>
      </section>
    </div>
  );
}

function ModalFooter({
  submitLabel,
  isSaving,
  onCancel,
  onSubmit,
}: {
  submitLabel: string;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 px-4 text-sm font-bold text-zinc-200 hover:bg-zinc-800"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={isSaving}
        onClick={onSubmit}
        className="inline-flex h-10 items-center justify-center rounded-md bg-amber-500 px-4 text-sm font-black text-zinc-950 hover:bg-amber-400 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-zinc-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
      />
    </label>
  );
}

function RoleField({ value, onChange }: { value: AdminRole; onChange: (value: AdminRole) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-zinc-200">Role</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AdminRole)}
        className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100 focus:border-amber-500 focus:outline-none"
      >
        {editableRoleOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function StatusField({ value, onChange }: { value: AdminUserStatus; onChange: (value: AdminUserStatus) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-zinc-200">Status</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AdminUserStatus)}
        className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100 focus:border-amber-500 focus:outline-none"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function validateAddForm(form: AddAdminForm, admins: SerializedAdminUser[]) {
  if (form.name.trim().length < 2) return 'Admin name is required.';
  if (!isValidEmail(form.email)) return 'Please enter a valid email address.';
  if (!isValidUsername(form.username)) {
    return 'Username must be 3-32 characters and can only contain letters, numbers, dots, underscores, and hyphens.';
  }
  if (admins.some((admin) => admin.email.toLowerCase() === form.email.trim().toLowerCase())) {
    return 'An admin with this email already exists.';
  }
  if (admins.some((admin) => admin.username.toLowerCase() === form.username.trim().toLowerCase())) {
    return 'An admin with this username already exists.';
  }
  if (form.password.length < 8) return 'Temporary password must be at least 8 characters.';
  if (form.password !== form.confirmPassword) return 'Passwords must match.';
  return null;
}

function validateEditForm(form: EditAdminForm) {
  if (form.name.trim().length < 2) return 'Admin name is required.';
  return null;
}

function validateResetPasswordForm(form: ResetPasswordForm) {
  if (form.password.length < 8) return 'New password must be at least 8 characters.';
  if (form.password !== form.confirmPassword) return 'Passwords must match.';
  return null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUsername(value: string) {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(value.trim());
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value: string | null) {
  if (!value) return 'Not available';

  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
