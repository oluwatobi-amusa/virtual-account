import { DashboardData, Merchant, Till, Transaction } from '../types/virtual-accounts';

const names = [
  'Adebayo Retail',
  'Bloom Foods',
  'Cedar Logistics',
  'Dune Fashion',
  'Eko Pharmacy',
  'Fresh Market',
  'Greenfield Supplies',
  'Harbour Electronics',
  'Ife Studios',
  'Jade Hospitality',
  'Kora Ventures',
  'Lagos Books'
];
const documents = [
  {
    label: 'CAC Doc',
    filename: 'cac-certificate.pdf',
    type: 'application/pdf' as const,
    url: '/documents/certificate',
    size: '0.7 KB'
  },
  {
    label: 'MEMART',
    filename: 'memorandum.pdf',
    type: 'application/pdf' as const,
    url: '/documents/certificate'
  },
  {
    label: 'Tax Document',
    filename: 'tax-certificate.svg',
    type: 'image/svg+xml' as const,
    url: '/documents/tax-certificate.svg'
  }
];
const merchants: Merchant[] = names.map((name, i) => ({
  id: `merchant-${i + 1}`,
  name,
  email: `hello@${name.toLowerCase().replace(/ /g, '')}.ng`,
  createdAt: `2026-${String(1 + (i % 9)).padStart(2, '0')}-${String(4 + i).padStart(2, '0')}`,
  status: i % 4 === 2 ? 'Suspended' : 'Active',
  firstName: ['Tunde', 'Amaka', 'Chidi', 'Zainab'][i % 4],
  lastName: ['Adebayo', 'Okafor', 'Obi', 'Bello'][i % 4],
  phone: i === 8 ? undefined : `+234 803 450 ${String(1200 + i)}`,
  bvnLastFour: String(4200 + i),
  businesses: Array.from({ length: i === 0 ? 2 : 1 }, (_, j) => ({
    id: `business-${i + 1}-${j + 1}`,
    name: j ? 'Adebayo Wholesale' : `${name} Limited`,
    registrationType: 'Limited liability company',
    rcNumber: `RC${1842000 + i * 2 + j}`,
    taxId: i === 8 ? undefined : `${10240000 + i}-0001`,
    registrationDate: `2024-03-${String(10 + i).padStart(2, '0')}`,
    email: j ? 'wholesale@adebayoretail.ng' : `business@${name.toLowerCase().replace(/ /g, '')}.ng`,
    address: `${12 + i} Adeola Odeku Street, Victoria Island, Lagos`,
    documents: j ? [documents[0]] : documents.slice(0, i % 3 === 1 ? 2 : 3)
  }))
}));
const tills: Till[] = merchants.flatMap((merchant, i) =>
  Array.from({ length: i === 0 ? 7 : i === 11 ? 0 : 2 }, (_, j) => ({
    id: `till-${i + 1}-${j + 1}`,
    merchantId: merchant.id,
    businessId: merchant.businesses[j % merchant.businesses.length].id,
    name: `${merchant.name} ${j === 0 ? 'Main' : `Branch ${j}`}`,
    number: `0${String(123456780 + i * 10 + j)}`,
    balance: Math.round((125000 + i * 34000 + j * 7250.5) * 100) / 100,
    status: j === 1 && i % 3 === 0 ? 'Disabled' : 'Active'
  }))
);
const transactions: Transaction[] = tills.flatMap((till, i) =>
  Array.from({ length: i === 5 ? 0 : 14 }, (_, j) => ({
    reference: `VA-${String(i + 1).padStart(3, '0')}-${String(j + 1).padStart(4, '0')}`,
    tillId: till.id,
    date: `2026-09-${String(28 - j).padStart(2, '0')}T${String(9 + (j % 8)).padStart(2, '0')}:30:00+01:00`,
    type: j % 3 === 1 ? 'Debit' : 'Credit',
    counterparty: ['Ada Okeke', 'Bola Adeyemi', 'Chinedu Eze', 'Fatima Hassan'][j % 4],
    counterpartyNumber: `0${String(221345670 + j)}`,
    bank: ['Access Bank', 'GTBank', 'Zenith Bank'][j % 3],
    description: j % 3 === 1 ? 'Supplier payment' : 'Customer payment',
    amount: 12500 + j * 1750.25,
    status: j % 7 === 5 ? 'Failed' : j % 7 === 6 ? 'Pending' : 'Successful'
  }))
);

const STORAGE_KEY = 'virtual-account-disabled-tills-v1';
const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 350));
function readDisabled(): string[] {
  const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string'))
    throw new Error('Saved account settings could not be read.');
  return value;
}

/** Replace these methods with API requests when virtual-account endpoints are available. */
export const virtualAccountsService = {
  async getDashboard(): Promise<DashboardData> {
    await delay();
    const disabled = readDisabled();
    return {
      merchants,
      transactions,
      tills: tills.map((till) => ({
        ...till,
        status: disabled.includes(till.id) ? 'Disabled' : till.status
      }))
    };
  },
  async disableTill(id: string): Promise<void> {
    await delay();
    if (!tills.some((till) => till.id === id)) throw new Error('Account not found.');
    const disabled = readDisabled();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set([...disabled, id]))));
  },
  async findTransaction(reference: string): Promise<Transaction | null> {
    await delay();
    // Useful for exercising the retry state without a live API.
    if (reference.toUpperCase() === 'DEMO-ERROR')
      throw new Error('Transaction lookup is temporarily unavailable. Please retry.');
    return (
      transactions.find(
        (transaction) => transaction.reference.toLowerCase() === reference.trim().toLowerCase()
      ) || null
    );
  }
};
