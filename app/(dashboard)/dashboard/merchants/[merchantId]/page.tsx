import MerchantDetails from '@/components/VirtualAccounts/MerchantDetails';
export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ merchantId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { merchantId } = await params;
  const { tab } = await searchParams;
  return (
    <MerchantDetails
      key={`${merchantId}-${tab || 'profile'}`}
      merchantId={merchantId}
      initialTab={tab === 'tills' ? 'tills' : 'profile'}
    />
  );
}
