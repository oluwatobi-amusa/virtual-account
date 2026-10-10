import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ merchantId: string }> }) {
  await params;
  redirect('/dashboard/document-verification');
}
