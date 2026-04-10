import { redirect } from 'next/navigation';

export default function ContractsListRedirect() {
  redirect('/landlord/properties');
}
