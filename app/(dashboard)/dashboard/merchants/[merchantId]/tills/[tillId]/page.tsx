import TransactionHistory from '@/components/VirtualAccounts/TransactionHistory';
export default async function Page({
  params
}: {
  params: Promise<{ merchantId: string; tillId: string }>;
}) {
  const { merchantId, tillId } = await params;
  return <TransactionHistory key={tillId} merchantId={merchantId} tillId={tillId} />;
}
