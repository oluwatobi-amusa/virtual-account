import DocumentReview from '@/components/VirtualAccounts/DocumentReview';

export default async function Page({
  params
}: {
  params: Promise<{ merchantId: string; businessId: string }>;
}) {
  const { merchantId, businessId } = await params;
  return (
    <DocumentReview
      key={`${merchantId}-${businessId}`}
      merchantId={merchantId}
      businessId={businessId}
    />
  );
}
