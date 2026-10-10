const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function service(storage = new Map(), transform = (source) => source) {
  const filename = path.join(__dirname, '../app/(dashboard)/dashboard/queries/virtual-accounts.ts');
  const source = ts.transpileModule(transform(fs.readFileSync(filename, 'utf8')), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const context = {
    exports: {},
    setTimeout: (resolve) => resolve(),
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value)
    }
  };
  vm.runInNewContext(source, context, { filename });
  return context.exports.virtualAccountsService;
}

test('mock relationships, account numbers, totals and all requested statuses are coherent', async () => {
  const data = await service().getDashboard();
  assert.equal(data.merchants.length, 12);
  assert.equal(data.tills.length, 27);
  assert.equal(data.merchants.filter((m) => m.status === 'Active').length, 9);
  assert.equal(data.tills.filter((t) => t.status === 'Active').length, 0);
  assert.equal(
    data.tills.filter((t) => t.merchantId === 'merchant-1').reduce((sum, t) => sum + t.balance, 0),
    1027260.5
  );
  for (const till of data.tills) {
    const merchant = data.merchants.find((m) => m.id === till.merchantId);
    assert.ok(merchant.businesses.some((b) => b.id === till.businessId));
    assert.match(till.number, /^0\d{9}$/);
    assert.ok(till.balance >= 0);
  }
  assert.ok(data.merchants.every((merchant) => merchant.name === `${merchant.firstName} ${merchant.lastName}`));
  assert.ok(data.merchants.flatMap((merchant) => merchant.businesses).every((business) => business.status === 'Pending'));
  for (const transaction of data.transactions) {
    assert.ok(data.tills.some((t) => t.id === transaction.tillId));
    assert.ok(['Successful', 'Pending', 'Failed'].includes(transaction.status));
  }
  assert.equal(new Set(data.transactions.map((t) => t.reference)).size, data.transactions.length);
  assert.ok(data.merchants[0].businesses.length > 1);
  assert.equal(data.merchants[0].businesses[1].documents.length, 1);
  assert.ok(data.merchants.every((m) => !('bvn' in m) && /^\d{4}$/.test(m.bvnLastFour)));
});

test('disabling persists across service loads, preserves balances, and rejects invalid accounts', async () => {
  const storage = new Map();
  const api = service(storage);
  const before = await api.getDashboard();
  await api.disableTill('till-1-1');
  await api.disableTill('till-1-1');
  const after = await service(storage).getDashboard();
  assert.equal(after.tills.find((t) => t.id === 'till-1-1').status, 'Disabled');
  assert.equal(after.tills.find((t) => t.id === 'till-1-1').balance, before.tills[0].balance);
  assert.equal(after.tills.filter((t) => t.status === 'Active').length, 0);
  await assert.rejects(api.disableTill('unknown-account'), /Account not found/);
});

test('lookup trims references, matches case insensitively and supports empty and error responses', async () => {
  const api = service();
  const transaction = await api.findTransaction('  va-001-0001  ');
  assert.equal(transaction.tillId, 'till-1-1');
  assert.equal(transaction.status, 'Successful');
  assert.equal((await api.findTransaction('VA-001-0006')).status, 'Failed');
  assert.equal((await api.findTransaction('VA-001-0007')).status, 'Pending');
  assert.equal(await api.findTransaction('NOT-FOUND'), null);
  await assert.rejects(api.findTransaction('DEMO-ERROR'), /temporarily unavailable/);
});

test('storage failures do not change account state', async () => {
  const storage = new Map();
  storage.set = () => {
    throw new Error('Storage unavailable');
  };
  const api = service(storage);
  await assert.rejects(api.disableTill('till-1-1'), /Storage unavailable/);
  assert.equal((await api.getDashboard()).tills[0].status, 'Pending');
});

test('restoring a suspended merchant persists and preserves its accounts and history', async () => {
  const storage = new Map();
  const api = service(storage);
  const before = await api.getDashboard();
  assert.equal(before.merchants.find((m) => m.id === 'merchant-3').status, 'Suspended');
  await api.restoreMerchant('merchant-3');
  await api.restoreMerchant('merchant-3');
  const after = await service(storage).getDashboard();
  assert.equal(after.merchants.find((m) => m.id === 'merchant-3').status, 'Active');
  assert.equal(after.merchants.find((m) => m.id === 'merchant-7').status, 'Suspended');
  assert.equal(JSON.stringify(after.tills.map(({ status, ...account }) => account)), JSON.stringify(before.tills.map(({ status, ...account }) => account)));
  assert.equal(JSON.stringify(after.transactions), JSON.stringify(before.transactions));
  await assert.rejects(api.restoreMerchant('unknown-merchant'), /Merchant not found/);
});

test('failed merchant restoration leaves the merchant suspended', async () => {
  const storage = new Map();
  storage.set = () => { throw new Error('Storage unavailable'); };
  const api = service(storage);
  await assert.rejects(api.restoreMerchant('merchant-3'), /Storage unavailable/);
  assert.equal((await api.getDashboard()).merchants.find((m) => m.id === 'merchant-3').status, 'Suspended');
});

test('approval persists, preserves suspension and financial records, and rejects duplicate decisions', async () => {
  const storage = new Map();
  const api = service(storage);
  const before = await api.getDashboard();
  await api.reviewBusiness('merchant-3', 'business-3-1', 'Approved');
  const after = await service(storage).getDashboard();
  const merchant = after.merchants.find((item) => item.id === 'merchant-3');
  assert.equal(merchant.businesses[0].verification.status, 'Approved');
  assert.ok(merchant.businesses[0].verification.reviewedAt);
  assert.equal(merchant.status, 'Suspended');
  assert.equal(JSON.stringify(after.tills.map(({ status, ...account }) => account)), JSON.stringify(before.tills.map(({ status, ...account }) => account)));
  assert.equal(JSON.stringify(after.transactions), JSON.stringify(before.transactions));
  await assert.rejects(api.reviewBusiness('merchant-3', 'business-3-1', 'Declined', 'Invalid certificate'), /already been reviewed/);
});

test('decline requires a reason and saves the trimmed reason on the merchant', async () => {
  const storage = new Map();
  const api = service(storage);
  await assert.rejects(api.reviewBusiness('merchant-2', 'business-2-1', 'Declined', '   '), /Enter a reason/);
  await assert.rejects(api.reviewBusiness('merchant-2', 'business-2-1', 'Declined', 'x'.repeat(1001)), /1,000/);
  await api.reviewBusiness('merchant-2', 'business-2-1', 'Declined', '  Please upload your tax document.  ');
  const merchant = (await service(storage).getDashboard()).merchants.find((item) => item.id === 'merchant-2');
  assert.equal(merchant.businesses[0].verification.status, 'Declined');
  assert.equal(merchant.businesses[0].verification.reason, 'Please upload your tax document.');
});

test('approval requires every business document and validates merchant and decision', async () => {
  const api = service();
  await assert.rejects(api.reviewBusiness('merchant-1', 'business-1-2', 'Approved'), /All required documents/);
  await assert.rejects(api.reviewBusiness('merchant-2', 'business-2-1', 'Approved'), /All required documents/);
  await assert.rejects(api.reviewBusiness('unknown-merchant', 'unknown-business', 'Approved'), /Merchant not found/);
  await assert.rejects(api.reviewBusiness('merchant-3', 'business-3-1', 'Pending'), /Invalid verification decision/);
});

test('newly uploaded documents return a reviewed merchant to the pending queue', async () => {
  const storage = new Map();
  await service(storage).reviewBusiness('merchant-3', 'business-3-1', 'Approved');
  const updated = service(storage, (source) => source.replace('const tills: Till[]',
    "merchants[2].businesses[0].documents[0].uploadedAt = '2026-10-10T12:00:00+01:00';\nconst tills: Till[]"));
  const merchant = (await updated.getDashboard()).merchants.find((item) => item.id === 'merchant-3');
  assert.equal(merchant.businesses[0].verification.status, 'Pending');
  assert.equal(merchant.businesses[0].verification.submittedAt, '2026-10-10T12:00:00+01:00');
  await updated.reviewBusiness('merchant-3', 'business-3-1', 'Approved');
  assert.equal((await updated.getDashboard()).merchants[2].businesses[0].verification.status, 'Approved');
});

test('verification storage errors preserve pending state', async () => {
  const storage = new Map();
  storage.set = () => { throw new Error('Storage unavailable'); };
  const api = service(storage);
  await assert.rejects(api.reviewBusiness('merchant-3', 'business-3-1', 'Approved'), /Storage unavailable/);
  assert.equal((await api.getDashboard()).merchants[2].businesses[0].verification.status, 'Pending');
});

test('replacement uploads persist, reset declined verification, and support approval after missing documents arrive', async () => {
  const storage = new Map();
  const api = service(storage);
  await api.reviewBusiness('merchant-2', 'business-2-1', 'Declined', 'Tax document is missing.');
  await api.uploadDocument('merchant-2', 'business-2-1', {
    label: 'Tax Document', filename: 'tax.pdf', type: 'application/pdf',
    url: 'data:application/pdf;base64,JVBERi0xLjQ='
  });
  const reloaded = service(storage);
  const merchant = (await reloaded.getDashboard()).merchants.find((item) => item.id === 'merchant-2');
  assert.equal(merchant.businesses[0].verification.status, 'Pending');
  assert.equal(merchant.businesses[0].verification.reason, undefined);
  assert.equal(merchant.businesses[0].documents.find((item) => item.label === 'Tax Document').filename, 'tax.pdf');
  await reloaded.reviewBusiness('merchant-2', 'business-2-1', 'Approved');
  assert.equal((await reloaded.getDashboard()).merchants[1].businesses[0].verification.status, 'Approved');
});

test('invalid uploads and storage errors preserve declined verification', async () => {
  const storage = new Map();
  const api = service(storage);
  await api.reviewBusiness('merchant-3', 'business-3-1', 'Declined', 'The certificate is unreadable.');
  const document = { label: 'CAC Doc', filename: 'cac.pdf', type: 'application/pdf', url: 'data:application/pdf;base64,JVBERi0xLjQ=' };
  await assert.rejects(api.uploadDocument('merchant-3', 'business-2-1', document), /business not found/);
  await assert.rejects(api.uploadDocument('merchant-3', 'business-3-1', { ...document, type: 'text/html' }), /PDF, PNG or JPEG/);
  await assert.rejects(api.uploadDocument('merchant-3', 'business-3-1', { ...document, url: 'data:application/pdf;base64,' + 'A'.repeat(2800000) }), /2 MB/);
  storage.set = () => { throw new Error('Storage unavailable'); };
  await assert.rejects(api.uploadDocument('merchant-3', 'business-3-1', document), /Storage unavailable/);
  assert.equal((await api.getDashboard()).merchants[2].businesses[0].verification.status, 'Declined');
});

test('business decisions and resubmissions are isolated within the same merchant', async () => {
  const storage = new Map();
  const api = service(storage);
  await api.reviewBusiness('merchant-1', 'business-1-1', 'Approved');
  await api.reviewBusiness('merchant-1', 'business-1-2', 'Declined', 'Upload the missing documents.');
  let merchant = (await service(storage).getDashboard()).merchants[0];
  assert.equal(merchant.businesses[0].verification.status, 'Approved');
  assert.equal(merchant.businesses[1].verification.status, 'Declined');
  assert.equal(merchant.businesses[1].verification.reason, 'Upload the missing documents.');
  await api.uploadDocument('merchant-1', 'business-1-2', {
    label: 'MEMART', filename: 'memart.pdf', type: 'application/pdf', url: 'data:application/pdf;base64,JVBERi0xLjQ='
  });
  merchant = (await service(storage).getDashboard()).merchants[0];
  assert.equal(merchant.businesses[0].verification.status, 'Approved');
  assert.equal(merchant.businesses[1].verification.status, 'Pending');
  await assert.rejects(api.reviewBusiness('merchant-1', 'business-2-1', 'Approved'), /business not found/);
});

test('existing merchant decisions carry over to matching business submissions', async () => {
  const storage = new Map();
  const before = (await service(storage).getDashboard()).merchants[2];
  storage.set('virtual-account-verifications-v1', JSON.stringify([{
    merchantId: before.id, status: 'Declined', reason: 'Unreadable document.', reviewedAt: '2026-10-10T10:00:00Z',
    submission: JSON.stringify(before.businesses.map((business) => [business.id, business.documents]))
  }]));
  const after = (await service(storage).getDashboard()).merchants[2];
  assert.equal(after.businesses[0].verification.status, 'Declined');
  assert.equal(after.businesses[0].verification.reason, 'Unreadable document.');
});

test('only an approved business and its enabled tills become active', async () => {
  const storage = new Map();
  const api = service(storage);
  await api.disableTill('till-1-1');
  await api.reviewBusiness('merchant-1', 'business-1-1', 'Approved');
  let data = await api.getDashboard();
  assert.equal(data.merchants[0].businesses[0].status, 'Active');
  assert.equal(data.merchants[0].businesses[1].status, 'Pending');
  assert.equal(data.tills.find((till) => till.id === 'till-1-1').status, 'Disabled');
  assert.equal(data.tills.find((till) => till.id === 'till-1-3').status, 'Active');
  assert.equal(data.tills.find((till) => till.id === 'till-1-4').status, 'Pending');
  await api.uploadDocument('merchant-1', 'business-1-1', {
    label: 'CAC Doc', filename: 'replacement.pdf', type: 'application/pdf', url: 'data:application/pdf;base64,JVBERi0xLjQ='
  });
  data = await api.getDashboard();
  assert.equal(data.merchants[0].businesses[0].status, 'Pending');
  assert.equal(data.tills.find((till) => till.id === 'till-1-3').status, 'Pending');
  assert.equal(data.tills.find((till) => till.id === 'till-1-1').status, 'Disabled');
  await api.reviewBusiness('merchant-1', 'business-1-1', 'Declined', 'Document is unreadable.');
  assert.equal((await api.getDashboard()).merchants[0].businesses[0].status, 'Declined');
});
