import { requireAdminPage } from '../../lib/admin-auth';
import { AdminPageShell } from '../page';
import { OperationsForm } from '../../components/operations-form';
export const dynamic='force-dynamic';
export default async function OperationsPage() {
  await requireAdminPage('/admin/operations');
  return <AdminPageShell eyebrow="Operations" title="备份与内容维护"><OperationsForm /></AdminPageShell>;
}
