import { AdminPanel } from '@/components/admin/AdminLayout';

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AdminPanel className="p-8">
      <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>
    </AdminPanel>
  );
}
