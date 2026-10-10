export type MerchantStatus = 'Active' | 'Suspended';
export type TillStatus = 'Active' | 'Disabled';
export type TransactionStatus = 'Successful' | 'Pending' | 'Failed';
export interface UploadedDocument {
  label: string;
  filename: string;
  type: 'application/pdf' | 'image/svg+xml';
  size?: string;
  url: string;
}
export interface Business {
  id: string;
  name: string;
  registrationType?: string;
  rcNumber?: string;
  taxId?: string;
  registrationDate?: string;
  email?: string;
  address?: string;
  documents: UploadedDocument[];
}
export interface Merchant {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: MerchantStatus;
  firstName: string;
  lastName: string;
  phone?: string;
  bvnLastFour?: string;
  businesses: Business[];
}
export interface Till {
  id: string;
  merchantId: string;
  businessId: string;
  name: string;
  number: string;
  balance: number;
  status: TillStatus;
}
export interface Transaction {
  reference: string;
  tillId: string;
  date: string;
  type: 'Credit' | 'Debit';
  counterparty: string;
  counterpartyNumber: string;
  bank: string;
  description: string;
  amount: number;
  status: TransactionStatus;
}
export interface DashboardData {
  merchants: Merchant[];
  tills: Till[];
  transactions: Transaction[];
}
