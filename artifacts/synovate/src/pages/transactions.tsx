import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, CalendarDays, Check, ChevronLeft, ChevronRight, CirclePlus, FileUp, Pencil, Search, Trash2, Upload, X } from 'lucide-react';
import {
  getGetTransactionSummaryQueryKey, getListTransactionsQueryKey,
  useCreateTransaction, useDeleteTransaction, useImportTransactionCsv,
  useGetTransactionSummary, useListTransactions, usePreviewTransactionCsv, useUpdateTransaction,
  type ListTransactionsParams, type Transaction, type TransactionCategory,
  type TransactionCsvInput, type TransactionCsvPreview, type TransactionInput,
} from '@workspace/api-client-react';
import { Button, Card, Empty, ErrorState, Loading } from '@/components/ui-kit';

const incomeCategories: TransactionCategory[] = ['Salary', 'Freelance', 'Business', 'Other'];
const expenseCategories: TransactionCategory[] = ['Housing', 'Food', 'Transport', 'Healthcare', 'Education', 'Shopping', 'Entertainment', 'Utilities', 'EMI/Loans', 'Subscriptions', 'Other'];
const dateToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const currency = (amount: number, currencyCode: string | null = null) => {
  if (!currencyCode) return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  }
};
const dateLabel = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

type FormValues = { type: 'INCOME' | 'EXPENSE'; amount: string; category: TransactionCategory; description: string; transactionDate: string; recurring: boolean };
const blankForm = (): FormValues => ({ type: 'EXPENSE', amount: '', category: 'Housing', description: '', transactionDate: dateToday(), recurring: false });

function TransactionForm({ initial, busy, error, onCancel, onSave }: {
  initial?: Transaction;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (value: TransactionInput) => void;
}) {
  const [form, setForm] = useState<FormValues>(() => initial ? {
    type: initial.type, amount: String(initial.amount), category: initial.category,
    description: initial.description ?? '', transactionDate: initial.transactionDate.slice(0, 10), recurring: initial.recurring ?? false,
  } : blankForm());
  const [validation, setValidation] = useState('');
  const categories = form.type === 'INCOME' ? incomeCategories : expenseCategories;
  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(form.amount)) {
      setValidation('Enter a positive amount with no more than two decimal places.');
      return;
    }
    setValidation('');
    onSave({ type: form.type, amount, category: form.category, transactionDate: form.transactionDate, recurring: form.recurring, ...(form.description.trim() ? { description: form.description.trim() } : {}) });
  }
  return <div className="tx-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="tx-dialog" role="dialog" aria-modal="true" aria-labelledby="tx-form-title">
      <div className="tx-dialog-head"><div><span className="chart-kicker">{initial ? 'UPDATE ENTRY' : 'NEW ENTRY'}</span><h2 id="tx-form-title">{initial ? 'Edit transaction' : 'Add a transaction'}</h2></div><button className="icon-button" aria-label="Close form" data-testid="button-close-transaction-form" onClick={onCancel}><X size={18} /></button></div>
      <form onSubmit={submit} className="tx-form">
        <div className="tx-type-switch" role="group" aria-label="Transaction type">
          {(['EXPENSE', 'INCOME'] as const).map((type) => <button type="button" key={type} className={form.type === type ? 'selected' : ''} onClick={() => { update('type', type); update('category', type === 'INCOME' ? 'Salary' : 'Housing'); }} data-testid={`button-type-${type.toLowerCase()}`}>{type === 'INCOME' ? 'Income' : 'Expense'}</button>)}
        </div>
        <label className="field-wrap"><span className="field-label">Amount</span><input autoFocus className="field-input" type="number" min="0.01" step="0.01" max="999999999999.99" placeholder="0.00" value={form.amount} onChange={(e) => update('amount', e.target.value)} required data-testid="input-transaction-amount" /></label>
        <div className="tx-form-two">
          <label className="field-wrap"><span className="field-label">Category</span><select className="field-input" value={form.category} onChange={(e) => update('category', e.target.value as TransactionCategory)} data-testid="select-transaction-category">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className="field-wrap"><span className="field-label">Date</span><input className="field-input" type="date" value={form.transactionDate} onChange={(e) => update('transactionDate', e.target.value)} required data-testid="input-transaction-date" /></label>
        </div>
        <label className="field-wrap"><span className="field-label">Description <span className="tx-optional">Optional</span></span><input className="field-input" maxLength={500} placeholder="Add a note" value={form.description} onChange={(e) => update('description', e.target.value)} data-testid="input-transaction-description" /></label>
        <label className="tx-check"><input type="checkbox" checked={form.recurring} onChange={(e) => update('recurring', e.target.checked)} data-testid="input-transaction-recurring" /><span>Mark as recurring</span></label>
        {(validation || error) && <p className="form-error" role="alert" data-testid="error-transaction-form">{validation || error}</p>}
        <div className="tx-form-actions"><Button variant="outline" type="button" onClick={onCancel} data-testid="button-cancel-transaction">Cancel</Button><Button type="submit" disabled={busy} data-testid="button-save-transaction">{busy ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}</Button></div>
      </form>
    </section>
  </div>;
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<ListTransactionsParams['sortBy']>('transactionDate');
  const [sortOrder, setSortOrder] = useState<ListTransactionsParams['sortOrder']>('DESC');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [adding, setAdding] = useState(false);
  const [csvInput, setCsvInput] = useState<TransactionCsvInput | null>(null);
  const [csvPreview, setCsvPreview] = useState<TransactionCsvPreview | null>(null);
  const [fileError, setFileError] = useState('');
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo<ListTransactionsParams>(() => ({
    ...(search ? { search } : {}),
    ...(type ? { type: type as 'INCOME' | 'EXPENSE' } : {}),
    ...(category ? { category: category as TransactionCategory } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    sortBy, sortOrder, page, pageSize: 10,
  }), [search, type, category, fromDate, toDate, sortBy, sortOrder, page]);
  const query = useListTransactions(params, { query: { queryKey: getListTransactionsQueryKey(params) } });
  const summary = useGetTransactionSummary({ query: { queryKey: getGetTransactionSummaryQueryKey() } });
  const formatAmount = (amount: number) => currency(amount, summary.data?.currencyCode ?? null);
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const previewMutation = usePreviewTransactionCsv();
  const importMutation = useImportTransactionCsv();
  const categories = type === 'INCOME' ? incomeCategories : type === 'EXPENSE' ? expenseCategories : [...incomeCategories.slice(0, 3), ...expenseCategories.slice(0, -1), 'Other' as TransactionCategory];
  const mutationBusy = create.isPending || update.isPending;
  const mutationError = (create.error || update.error)?.message;

  function refreshData() {
    void queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetTransactionSummaryQueryKey() });
  }
  function saveTransaction(data: TransactionInput) {
    if (editing) update.mutate({ transactionId: editing.id, data }, { onSuccess: () => { setEditing(null); refreshData(); } });
    else create.mutate({ data }, { onSuccess: () => { setAdding(false); refreshData(); } });
  }
  function deleteTransaction(transaction: Transaction) {
    if (window.confirm(`Delete this ${transaction.type.toLowerCase()} transaction? This cannot be undone.`)) {
      remove.mutate({ transactionId: transaction.id }, { onSuccess: refreshData });
    }
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileError(''); setCsvPreview(null); setCsvInput(null); setImportMessage('');
    if (!file.name.toLowerCase().endsWith('.csv') || (file.type && !['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.type))) {
      setFileError('Choose a CSV file with a supported CSV MIME type.'); return;
    }
    if (file.size > 1_000_000) { setFileError('This file is larger than 1 MB. Choose a smaller CSV file.'); return; }
    try {
      const input = { fileName: file.name, ...(file.type ? { mimeType: file.type } : {}), csvText: await file.text() };
      setCsvInput(input);
      previewMutation.mutate({ data: input }, { onSuccess: setCsvPreview, onError: (error) => setFileError(error.message || 'The CSV preview could not be prepared.') });
    } catch {
      setFileError('The selected file could not be read. Please try again.');
    }
  }
  function importCsv() {
    if (!csvInput || !csvPreview?.canImport) return;
    importMutation.mutate({ data: csvInput }, {
      onSuccess: (result) => {
        setImportMessage(`${result.importedCount} ${result.importedCount === 1 ? 'transaction' : 'transactions'} imported.`);
        setCsvInput(null); setCsvPreview(null); refreshData();
      },
      onError: (error) => {
        const response = error as Error & { error?: string; canImport?: boolean; invalidRows?: Array<{ rowNumber: number; errors: string[] }> };
        if (typeof response.canImport === 'boolean') setCsvPreview(response as unknown as TransactionCsvPreview);
        setFileError(response.error || response.message || 'Import failed. Review the preview and try again.');
      },
    });
  }
  function changeSort(field: NonNullable<ListTransactionsParams['sortBy']>) {
    setSortOrder(sortBy === field && sortOrder === 'ASC' ? 'DESC' : 'ASC');
    setSortBy(field); setPage(1);
  }
  const result = query.data;
  return <div className="transactions-page page-enter">
    <style>{`
      .transactions-page{--tx-ink:#263f42;--tx-muted:#7c8983}
      .tx-toolbar{display:flex;justify-content:space-between;align-items:center;gap:14px;margin:0 0 17px}
      .tx-toolbar-actions{display:flex;gap:8px;align-items:center}
      .tx-filter-card{padding:14px;margin-bottom:14px}
      .tx-filters{display:grid;grid-template-columns:minmax(180px,1.8fr) repeat(4,minmax(110px,1fr));gap:9px;align-items:end}
      .tx-filters .field-wrap{gap:5px}.tx-filters .field-input{height:38px}
      .tx-search{position:relative}.tx-search svg{position:absolute;left:11px;top:12px;color:#87958f}.tx-search input{padding-left:34px}
      .tx-table-card{overflow:hidden}.tx-table-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid #edf0ed;color:#82908a;font-size:10px}
      .tx-table-head strong{color:#344d48;font-weight:600}.tx-table{overflow-x:auto}
      .tx-table table{min-width:740px}.tx-table th{white-space:nowrap;padding:12px 16px}.tx-table td{padding:14px 16px;color:#53645e;font-size:11px}
      .tx-sort{display:inline-flex;align-items:center;gap:5px;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer}
      .tx-description{display:block;color:#98a39d;font-size:9px;margin-top:4px}.tx-category{display:inline-flex;padding:5px 8px;border-radius:20px;background:#eff5f0;color:#557267;font-size:9px}
      .tx-type{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:600}.tx-type i{width:6px;height:6px;border-radius:50%;background:#538a72}.tx-type.expense i{background:#bd866b}
      .tx-amount{font-family:var(--app-font-mono);font-size:11px!important;font-weight:500;color:#31594d!important;white-space:nowrap}.tx-amount.expense{color:#56645f!important}
      .tx-row-actions{display:flex;justify-content:flex-end;gap:3px}.tx-pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 17px;color:#87938d;font-size:10px;border-top:1px solid #edf0ed}
      .tx-pagination-actions{display:flex;gap:5px}.tx-pagination .icon-button{border:1px solid #e5ebe6;background:#fff;width:30px;height:30px}
      .tx-error-inline{margin:12px}
      .tx-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:-2px 0 16px}
      .tx-summary-card{min-width:0;padding:13px 15px}
      .tx-summary-card span{display:block;color:#7c8983;font-size:9px}
      .tx-summary-card strong{display:block;margin-top:7px;color:#294349;font-family:var(--app-font-serif);font-size:clamp(16px,1.7vw,21px);letter-spacing:-.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .tx-summary-card.current{background:#eaf2ed;border-color:#dfe9e1}
      .tx-summary-card.current strong{color:#327262}
      .tx-import-panel{padding:18px;margin:0 0 15px}.tx-import-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.tx-import-title{display:flex;gap:11px;align-items:center}.tx-import-icon{display:grid;width:36px;height:36px;place-items:center;border-radius:10px;color:#397765;background:#eaf3ed}.tx-import-title h2{margin:0;color:#294349;font-family:var(--app-font-serif);font-size:16px}.tx-import-title p{margin:4px 0 0;color:#85918a;font-size:10px}
      .tx-file-label{position:relative;overflow:hidden}.tx-file-label input{position:absolute;inset:0;opacity:0;cursor:pointer}
      .tx-preview-summary{display:flex;gap:17px;flex-wrap:wrap;margin:17px 0 11px;padding:11px 12px;background:#f6f9f6;border:1px solid #e7eee8;border-radius:8px;color:#697a72;font-size:10px}.tx-preview-summary strong{color:#315c4f}.tx-preview-summary .rejected strong{color:#a65a4d}
      .tx-preview-list{max-height:208px;overflow:auto;border:1px solid #e8ede8;border-radius:8px}.tx-preview-row{display:grid;grid-template-columns:60px 1fr;gap:10px;padding:10px 12px;border-bottom:1px solid #edf0ed;font-size:10px}.tx-preview-row:last-child{border-bottom:0}.tx-preview-row b{color:#7e8b84;font-family:var(--app-font-mono);font-size:9px}.tx-preview-row p{margin:0;color:#a2574c}
      .tx-import-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}.tx-file-error{margin:12px 0 0;color:#9c5148;background:#fff4f1;border:1px solid #f0dfda;border-radius:8px;padding:9px 11px;font-size:10px}
      .tx-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:18px;background:rgba(21,39,43,.42);backdrop-filter:blur(3px)}
      .tx-dialog{width:min(100%,480px);padding:21px;background:#fff;border:1px solid #e3eae4;border-radius:15px;box-shadow:0 20px 60px rgba(25,49,51,.2)}
      .tx-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.tx-dialog-head h2{margin:3px 0 0;color:#263f42;font-family:var(--app-font-serif);font-size:21px;letter-spacing:-.04em}
      .tx-form{display:flex;flex-direction:column;gap:13px}.tx-type-switch{display:grid;grid-template-columns:1fr 1fr;padding:4px;background:#f1f5f1;border-radius:9px}.tx-type-switch button{height:34px;border:0;border-radius:7px;background:transparent;color:#73827b;font:600 11px var(--app-font-sans);cursor:pointer}.tx-type-switch button.selected{color:#2d6555;background:#fff;box-shadow:0 2px 7px rgba(25,60,47,.09)}
      .tx-form-two{display:grid;grid-template-columns:1fr 1fr;gap:11px}.tx-form select{appearance:auto}.tx-optional{font-weight:400;color:#9ba59f;margin-left:4px}.tx-check{display:flex;align-items:center;gap:8px;color:#6e7e76;font-size:10px}.tx-check input{accent-color:#397f71}
      .tx-form-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:3px}.tx-dialog .field-input{height:40px}.tx-empty-action{margin-top:15px}
      @media(max-width:850px){.tx-filters{grid-template-columns:repeat(3,minmax(0,1fr))}.tx-search{grid-column:span 3}}
      @media(max-width:767px){.tx-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:600px){.tx-toolbar{align-items:flex-start;flex-direction:column}.tx-toolbar-actions{width:100%}.tx-toolbar-actions .btn{flex:1}.tx-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.tx-search{grid-column:span 2}.tx-import-head{flex-direction:column}.tx-import-head .btn{width:100%}.tx-table-head{padding:13px}.tx-pagination{padding:11px 12px}.tx-form-two{grid-template-columns:1fr}.tx-dialog{padding:17px}.tx-preview-row{grid-template-columns:48px 1fr}}
    `}</style>
    <div className="page-intro"><div><div className="eyebrow">YOUR ACCOUNT <span className="eyebrow-line" /></div><h1>Transactions</h1><p>A clear record of money in and money out.</p></div></div>
    {summary.isLoading ? <div className="tx-summary-grid" aria-label="Transaction summary loading"><Card className="tx-summary-card"><Loading label="Loading income summary" /></Card><Card className="tx-summary-card"><Loading label="Loading expense summary" /></Card><Card className="tx-summary-card"><Loading label="Loading cash flow summary" /></Card><Card className="tx-summary-card"><Loading label="Loading monthly cash flow summary" /></Card></div> : summary.isError || !summary.data ? <div style={{ marginBottom: 15 }}><ErrorState onRetry={() => { void summary.refetch(); }} /></div> : <section className="tx-summary-grid" aria-label="Transaction summary" data-testid="transaction-summary">
      <Card className="tx-summary-card" data-testid="summary-total-income"><span>Total income</span><strong>{currency(summary.data.totalIncome, summary.data.currencyCode)}</strong></Card>
      <Card className="tx-summary-card" data-testid="summary-total-expenses"><span>Total expenses</span><strong>{currency(summary.data.totalExpenses, summary.data.currencyCode)}</strong></Card>
      <Card className="tx-summary-card" data-testid="summary-net-cash-flow"><span>Net cash flow</span><strong>{currency(summary.data.netCashFlow, summary.data.currencyCode)}</strong></Card>
      <Card className="tx-summary-card current" data-testid="summary-current-month-net-cash-flow"><span>Current-month net cash flow</span><strong>{currency(summary.data.currentMonthNetCashFlow, summary.data.currencyCode)}</strong></Card>
    </section>}
    <div className="tx-toolbar"><span className="tx-toolbar-note" style={{ color: '#84918b', fontSize: 10 }}>Only transactions belonging to your account are shown.</span><div className="tx-toolbar-actions"><label className="btn btn-outline btn-md tx-file-label" data-testid="button-choose-csv"><FileUp size={15} /> Preview CSV<input type="file" accept=".csv,text/csv,application/csv,application/vnd.ms-excel,text/plain" onChange={chooseFile} data-testid="input-transaction-csv" aria-label="Choose CSV file" /></label><Button onClick={() => { setAdding(true); setEditing(null); }} data-testid="button-add-transaction"><CirclePlus size={15} /> Add transaction</Button></div></div>

    {(csvPreview || fileError || importMessage || previewMutation.isPending || importMutation.isPending) && <Card className="tx-import-panel" data-testid="panel-csv-import">
      <div className="tx-import-head"><div className="tx-import-title"><span className="tx-import-icon"><Upload size={17} /></span><div><h2>CSV import</h2><p>{csvInput?.fileName ?? 'Select a CSV to validate before importing.'}</p></div></div><button className="icon-button" onClick={() => { setCsvPreview(null); setCsvInput(null); setFileError(''); setImportMessage(''); }} aria-label="Close CSV panel" data-testid="button-close-csv"><X size={17} /></button></div>
      {previewMutation.isPending && <Loading label="Validating CSV file" />}
      {fileError && <p className="tx-file-error" role="alert" data-testid="error-csv">{fileError}</p>}
      {importMessage && <p className="form-success" role="status" data-testid="status-csv-import">{importMessage}</p>}
      {csvPreview && <><div className="tx-preview-summary"><span><strong>{csvPreview.totalRows}</strong> rows</span><span><strong>{csvPreview.acceptedRows}</strong> accepted</span><span className="rejected"><strong>{csvPreview.rejectedRows}</strong> rejected</span><span>{csvPreview.canImport ? 'Ready to import' : 'Import unavailable'}</span></div>
        {csvPreview.invalidRows.length > 0 && <div className="tx-preview-list" aria-label="CSV row errors">{csvPreview.invalidRows.map((row) => <div className="tx-preview-row" key={row.rowNumber} data-testid={`csv-error-row-${row.rowNumber}`}><b>Row {row.rowNumber}</b><div>{row.errors.map((message, index) => <p key={index}>{message}</p>)}</div></div>)}</div>}
      {csvPreview.validRows.length > 0 && <div className="tx-preview-list" aria-label="Valid CSV rows">{csvPreview.validRows.slice(0, 8).map(({ rowNumber, transaction }) => <div className="tx-preview-row" key={rowNumber}><b>Row {rowNumber}</b><span>{transaction.transactionDate} · {transaction.category} · {formatAmount(transaction.amount)} · {transaction.type.toLowerCase()}</span></div>)}{csvPreview.validRows.length > 8 && <div className="tx-preview-row"><b>More</b><span>{csvPreview.validRows.length - 8} additional valid rows</span></div>}</div>}
        <div className="tx-import-footer"><span style={{ color: '#85918a', fontSize: 9 }}>Preview only. Your records are written after import.</span><Button disabled={!csvPreview.canImport || importMutation.isPending} onClick={importCsv} data-testid="button-import-csv">{importMutation.isPending ? 'Importing…' : <><Check size={14} /> Import transactions</>}</Button></div>
      </>}
    </Card>}

    <Card className="tx-filter-card"><div className="tx-filters">
      <label className="field-wrap tx-search"><span className="field-label">Search</span><Search size={15} /><input className="field-input" placeholder="Description or category" maxLength={100} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} data-testid="input-transaction-search" /></label>
      <label className="field-wrap"><span className="field-label">Type</span><select className="field-input" value={type} onChange={(e) => { setType(e.target.value); setCategory(''); setPage(1); }} data-testid="filter-transaction-type"><option value="">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select></label>
      <label className="field-wrap"><span className="field-label">Category</span><select className="field-input" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} data-testid="filter-transaction-category"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="field-wrap"><span className="field-label">From</span><input className="field-input" type="date" value={fromDate} max={toDate || undefined} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} data-testid="filter-transaction-from-date" /></label>
      <label className="field-wrap"><span className="field-label">To</span><input className="field-input" type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setPage(1); }} data-testid="filter-transaction-to-date" /></label>
    </div></Card>

    {query.isLoading ? <Card><Loading label="Loading transactions" /></Card> : query.isError ? <ErrorState onRetry={() => { void query.refetch(); }} /> : !result?.transactions.length ? <Card><Empty title={search || type || category || fromDate || toDate ? 'No matching transactions' : 'No transactions yet'} description={search || type || category || fromDate || toDate ? 'Try adjusting your search or filters.' : 'Add your first income or expense to begin a clear account of your cash flow.'} />{!search && !type && !category && !fromDate && !toDate && <div className="tx-empty-action" style={{ display: 'flex', justifyContent: 'center', paddingBottom: 25 }}><Button onClick={() => setAdding(true)} data-testid="button-add-first-transaction"><CirclePlus size={15} /> Add transaction</Button></div>}</Card> : <Card className="tx-table-card">
      <div className="tx-table-head"><span><strong>{result.total}</strong> {result.total === 1 ? 'transaction' : 'transactions'}</span><label style={{ display: 'flex', alignItems: 'center', gap: 7 }}>Sort by <select className="field-input" style={{ width: 145, height: 32 }} value={sortBy} onChange={(e) => { setSortBy(e.target.value as NonNullable<ListTransactionsParams['sortBy']>); setPage(1); }} data-testid="select-transaction-sort"><option value="transactionDate">Date</option><option value="amount">Amount</option><option value="category">Category</option><option value="createdAt">Created</option></select><button className="icon-button" aria-label={`Sort ${sortOrder === 'DESC' ? 'ascending' : 'descending'}`} onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')} data-testid="button-sort-order">{sortOrder === 'DESC' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}</button></label></div>
      {remove.error && <div className="tx-error-inline"><p className="form-error" role="alert">Could not delete transaction: {remove.error.message}</p></div>}
      <div className="tx-table"><table><thead><tr><th><button className="tx-sort" onClick={() => changeSort('transactionDate')} data-testid="sort-transaction-date"><CalendarDays size={12} /> Date {sortBy === 'transactionDate' ? sortOrder === 'DESC' ? '↓' : '↑' : ''}</button></th><th>Details</th><th><button className="tx-sort" onClick={() => changeSort('category')} data-testid="sort-transaction-category">Category {sortBy === 'category' ? sortOrder === 'DESC' ? '↓' : '↑' : ''}</button></th><th>Type</th><th><button className="tx-sort" onClick={() => changeSort('amount')} data-testid="sort-transaction-amount">Amount {sortBy === 'amount' ? sortOrder === 'DESC' ? '↓' : '↑' : ''}</button></th><th aria-label="Actions" /></tr></thead><tbody>
        {result.transactions.map((transaction) => <tr key={transaction.id} data-testid={`row-transaction-${transaction.id}`}><td>{dateLabel(transaction.transactionDate)}</td><td><strong style={{ color: '#394f49', fontWeight: 600 }}>{transaction.description || transaction.category}</strong>{transaction.description && <span className="tx-description">{transaction.recurring ? 'Recurring entry' : 'Personal transaction'}</span>}</td><td><span className="tx-category">{transaction.category}</span></td><td><span className={`tx-type ${transaction.type === 'EXPENSE' ? 'expense' : ''}`}><i />{transaction.type === 'INCOME' ? 'Income' : 'Expense'}</span></td><td className={`tx-amount ${transaction.type === 'EXPENSE' ? 'expense' : ''}`}>{transaction.type === 'INCOME' ? '+' : '−'}{formatAmount(transaction.amount)}</td><td><div className="tx-row-actions"><button className="icon-button" aria-label={`Edit ${transaction.description || transaction.category}`} onClick={() => { setEditing(transaction); setAdding(false); }} data-testid={`button-edit-transaction-${transaction.id}`}><Pencil size={14} /></button><button className="icon-button" aria-label={`Delete ${transaction.description || transaction.category}`} disabled={remove.isPending} onClick={() => deleteTransaction(transaction)} data-testid={`button-delete-transaction-${transaction.id}`}><Trash2 size={14} /></button></div></td></tr>)}
      </tbody></table></div>
      <div className="tx-pagination"><span>Page {result.page} of {Math.max(result.totalPages, 1)}</span><div className="tx-pagination-actions"><button className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} data-testid="button-previous-transactions"><ChevronLeft size={16} /></button><button className="icon-button" aria-label="Next page" disabled={page >= result.totalPages} onClick={() => setPage((value) => Math.min(result.totalPages, value + 1))} data-testid="button-next-transactions"><ChevronRight size={16} /></button></div></div>
    </Card>}
    {query.isFetching && !query.isLoading && <p style={{ margin: '9px 3px', color: '#8b9690', fontSize: 9 }} role="status">Updating results…</p>}
    {(adding || editing) && <TransactionForm initial={editing ?? undefined} busy={mutationBusy} error={mutationError} onCancel={() => { setAdding(false); setEditing(null); create.reset(); update.reset(); }} onSave={saveTransaction} />}
  </div>;
}
