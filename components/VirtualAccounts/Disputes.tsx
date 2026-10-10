'use client';
import { FormEvent, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Transaction } from '@/app/(dashboard)/dashboard/types/virtual-accounts';
import { virtualAccountsService } from '@/app/(dashboard)/dashboard/queries/virtual-accounts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DataState,
  Fields,
  PageHeading,
  State,
  StatusBadge,
  date,
  money,
  useDashboard
} from './shared';

export default function Disputes() {
  const query = useDashboard();
  const [reference, setReference] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [result, setResult] = useState<Transaction | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'empty' | 'error'>('idle');
  const [error, setError] = useState('');
  const busy = useRef(false);
  async function lookup(value: string) {
    if (busy.current) return;
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter a transaction reference.');
      return;
    }
    busy.current = true;
    setReference(trimmed);
    setSubmitted(trimmed);
    setResult(null);
    setError('');
    setState('loading');
    try {
      const transaction = await virtualAccountsService.findTransaction(trimmed);
      setResult(transaction);
      setState(transaction ? 'found' : 'empty');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to find the transaction. Please retry.'
      );
      setState('error');
    } finally {
      busy.current = false;
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void lookup(reference);
  }
  if (!query.data) return <DataState query={query} />;
  const till = result ? query.data.tills.find((t) => t.id === result.tillId) : undefined;
  const merchant = query.data.merchants.find((m) => m.id === till?.merchantId);
  const business = merchant?.businesses.find((b) => b.id === till?.businessId);
  return (
    <div className="space-y-6">
      <PageHeading
        title="Disputes"
        description="Enter a transaction reference to retrieve its details."
      />
      <Card className="p-5 shadow-none">
        <form onSubmit={submit} className="max-w-2xl space-y-2">
          <label htmlFor="transaction-reference" className="text-sm font-medium">
            Transaction reference
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="transaction-reference"
              placeholder="Enter transaction reference"
              value={reference}
              disabled={state === 'loading'}
              onChange={(e) => {
                setReference(e.target.value);
                if (state === 'idle') setError('');
              }}
              required
              aria-describedby="lookup-error"
            />
            <Button type="submit" disabled={state === 'loading'}>
              {state === 'loading' ? <Loader2 className="animate-spin" /> : <Search />}
              {state === 'loading' ? 'Finding…' : 'Find transaction'}
            </Button>
          </div>
          <p
            id="lookup-error"
            role={error && state !== 'error' ? 'alert' : undefined}
            className="text-xs text-red-600"
          >
            {state !== 'error' ? error : ''}
          </p>
        </form>
      </Card>
      {state === 'loading' && <State loading title="Finding transaction…" />}
      {state === 'empty' && (
        <State
          title="No transaction found for this reference"
          description={`Check ${submitted} and try again.`}
        />
      )}
      {state === 'error' && (
        <State
          title="Unable to retrieve transaction"
          description={error}
          retry={() => {
            void lookup(submitted);
          }}
        />
      )}
      {state === 'found' && result && (
        <Card className="p-5 shadow-none">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Transaction details</h2>
            <StatusBadge status={result.status} />
          </div>
          <Fields
            entries={[
              ['Transaction reference', result.reference],
              ['Date and time', date(result.date, true)],
              ['Merchant name', merchant?.name],
              ['Business name', business?.name],
              ['Associated till / account name', till?.name],
              ['Virtual account number', till?.number],
              ['Sender / Recipient name', result.counterparty],
              ['Sender / Recipient account number', result.counterpartyNumber],
              ['Bank', result.bank],
              ['Transaction type', result.type],
              ['Description', result.description],
              ['Amount', money(result.amount)],
              ['Status', <StatusBadge key="status" status={result.status} />]
            ]}
          />
        </Card>
      )}
    </div>
  );
}
