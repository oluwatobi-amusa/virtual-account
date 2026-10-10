'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DataState,
  DateFilters,
  Fields,
  FilterSelect,
  PageHeading,
  Pagination,
  PAGE_SIZE,
  RecordsTable,
  SearchInput,
  State,
  StatusBadge,
  date,
  inRange,
  money,
  useDashboard
} from './shared';

export default function TransactionHistory({
  merchantId,
  tillId
}: {
  merchantId: string;
  tillId: string;
}) {
  const query = useDashboard();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  if (!query.data) return <DataState query={query} />;
  const till = query.data.tills.find((t) => t.id === tillId && t.merchantId === merchantId);
  const back = {
    href: `/dashboard/merchants/${merchantId}?tab=tills`,
    label: 'Back to Till accounts'
  };
  if (!till)
    return (
      <div className="space-y-4">
        <PageHeading title="Account not found" back={back} />
        <State title="This account is unavailable for this merchant." />
      </div>
    );
  const transactions = query.data.transactions.filter((t) => t.tillId === till.id);
  const filtered = transactions.filter(
    (t) =>
      `${t.reference} ${t.counterparty}`.toLowerCase().includes(search.trim().toLowerCase()) &&
      (type === 'All' || t.type === type) &&
      (status === 'All' || t.status === status) &&
      inRange(t.date, from, to)
  );
  return (
    <div className="space-y-6">
      <PageHeading
        title="Transaction history"
        description="Payments associated with this till account."
        back={back}
      />
      <Card className="p-5 shadow-none">
        <Fields
          entries={[
            ['Account name', till.name],
            ['Account number', till.number],
            ['Current balance', money(till.balance)]
          ]}
        />
      </Card>
      <Card className="overflow-hidden shadow-none">
        <div className="space-y-3 border-b p-4">
          <h2 className="font-semibold">Transactions</h2>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={change(setSearch)}
              placeholder="Search reference or sender / recipient"
            />
            <FilterSelect
              label="Type"
              value={type}
              onChange={change(setType)}
              options={['All', 'Credit', 'Debit']}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={change(setStatus)}
              options={['All', 'Successful', 'Pending', 'Failed']}
            />
            <DateFilters from={from} to={to} onFrom={change(setFrom)} onTo={change(setTo)} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setType('All');
                setStatus('All');
                setFrom('');
                setTo('');
                setPage(1);
              }}
            >
              <X />
              Clear filters
            </Button>
          </div>
          {from && to && from > to && (
            <p role="alert" className="text-xs text-red-600">
              From date must be before To date.
            </p>
          )}
        </div>
        <RecordsTable
          columns={[
            'Transaction reference',
            'Date and time',
            'Transaction type',
            'Sender / Recipient name',
            'Sender / Recipient account number',
            'Bank',
            'Description',
            'Amount',
            'Status'
          ]}
          empty={transactions.length ? undefined : 'No transactions for this account yet.'}
          rows={filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t) => [
            <span key="reference" className="font-medium text-starter-primary">
              {t.reference}
            </span>,
            date(t.date, true),
            t.type,
            t.counterparty,
            t.counterpartyNumber,
            t.bank,
            t.description,
            money(t.amount),
            <StatusBadge key="status" status={t.status} />
          ])}
        />
        <Pagination count={filtered.length} page={page} onChange={setPage} />
      </Card>
    </div>
  );
}
