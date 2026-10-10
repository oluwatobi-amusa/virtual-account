'use client';
import { DataState, money, PageHeading, SummaryCards, useDashboard } from './shared';

export default function Overview() {
  const query = useDashboard();
  if (!query.data) return <DataState query={query} />;
  const { merchants, tills, transactions } = query.data;
  return (
    <div className="space-y-6">
      <PageHeading
        title="Overview"
        description="A snapshot of your merchants and virtual accounts."
      />
      <SummaryCards
        items={[
          {
            label: 'Total Merchants',
            value: merchants.length,
            description: 'All registered merchants'
          },
          {
            label: 'Active Virtual Accounts',
            value: tills.filter((till) => till.status === 'Active').length,
            description: 'Accounts currently enabled'
          },
          {
            label: 'Payment Value',
            value: money(
              transactions
                .filter((t) => t.status === 'Successful' && t.type === 'Credit')
                .reduce((sum, t) => sum + t.amount, 0)
            ),
            description: 'Total successful incoming payments'
          }
        ]}
      />
    </div>
  );
}
