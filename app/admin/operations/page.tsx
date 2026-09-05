import { AdminAuthError, requireAdminPage } from '../../lib/admin-auth';
import { AdminAccessDenied, AdminPageShell } from '../page';
import { OperationsForm } from '../../components/operations-form';
export const dynamic='force-dynamic';
export default async function OperationsPage() {
  try {
    await requireAdminPage('/admin/operations');
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) return <AdminAccessDenied />;
    throw error;
  }
  return <AdminPageShell eyebrow="Operations" title="备份与内容维护"><OperationsForm /></AdminPageShell>;
}
