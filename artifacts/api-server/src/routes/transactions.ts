import { and, asc, count, desc, eq, gte, ilike, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import Papa from "papaparse";
import { z } from "zod/v4";
import { db, financialProfilesTable, transactionsTable } from "@workspace/db";
import { requireAuthentication, requireSameOrigin } from "../middleware/auth";

const router = Router();
const MAX_AMOUNT = 999999999999.99;
const MAX_CSV_BYTES = 1_000_000;
const MAX_CSV_ROWS = 500;
const incomeCategories = ["Salary", "Freelance", "Business", "Other"] as const;
const expenseCategories = [
  "Housing",
  "Food",
  "Transport",
  "Healthcare",
  "Education",
  "Shopping",
  "Entertainment",
  "Utilities",
  "EMI/Loans",
  "Subscriptions",
  "Other",
] as const;
const transactionCategories = [...incomeCategories, ...expenseCategories] as const;

const isoDateSchema = z.string().refine(isValidIsoDate, "Use a valid YYYY-MM-DD date.");

const transactionInputSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.number().finite().min(0.01).max(MAX_AMOUNT),
    category: z.enum(transactionCategories),
    description: z.string().trim().max(500).optional().default(""),
    transactionDate: isoDateSchema,
    recurring: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((transaction, context) => {
    const cents = transaction.amount * 100;
    if (Math.abs(cents - Math.round(cents)) > 0.00001) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Amount can have at most two decimal places.",
      });
    }

    const allowedCategories =
      transaction.type === "INCOME" ? incomeCategories : expenseCategories;
    if (!(allowedCategories as readonly string[]).includes(transaction.category)) {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "Category does not match the transaction type.",
      });
    }
  });

const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.enum(transactionCategories).optional(),
  fromDate: isoDateSchema.optional(),
  toDate: isoDateSchema.optional(),
  sortBy: z.enum(["transactionDate", "amount", "category", "createdAt"]).default("transactionDate"),
  sortOrder: z.enum(["ASC", "DESC"]).default("DESC"),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const csvInputSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().max(128).optional().default(""),
    csvText: z.string().min(1),
  })
  .strict();

const acceptedCsvMimeTypes = new Set([
  "",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
]);

type TransactionInput = z.infer<typeof transactionInputSchema>;
type CsvPreview = {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  canImport: boolean;
  validRows: Array<{ rowNumber: number; transaction: TransactionInput }>;
  invalidRows: Array<{ rowNumber: number; errors: string[] }>;
};

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function sendError(response: Response, status: number, error: string, code: string): void {
  response.status(status).json({ error, code });
}

function getUserId(request: Request, response: Response): string | undefined {
  if (!request.authUserId) {
    sendError(response, 401, "Sign in to continue.", "UNAUTHENTICATED");
    return undefined;
  }
  return request.authUserId;
}

function sanitizeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function serializeTransaction(row: typeof transactionsTable.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    description: row.description,
    transactionDate: row.transactionDate,
    recurring: row.recurring,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isCategoryForType(
  type: "INCOME" | "EXPENSE",
  category: string,
): boolean {
  const allowed = type === "INCOME" ? incomeCategories : expenseCategories;
  return (allowed as readonly string[]).includes(category);
}

function formatMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsv(fileName: string, mimeType: string, csvText: string):
  | { preview: CsvPreview }
  | { error: string; code: string } {
  if (!/\.csv$/i.test(fileName)) {
    return { error: "Choose a .csv file.", code: "INVALID_CSV_FILE_TYPE" };
  }
  if (!acceptedCsvMimeTypes.has(mimeType.toLowerCase())) {
    return { error: "The selected file is not a supported CSV.", code: "INVALID_CSV_FILE_TYPE" };
  }
  if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
    return { error: "CSV files must be 1 MB or smaller.", code: "CSV_FILE_TOO_LARGE" };
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_"),
  });
  const headers = parsed.meta.fields ?? [];
  const requiredHeaders = ["type", "amount", "category", "transaction_date"];
  const allowedHeaders = new Set([
    ...requiredHeaders,
    "description",
    "recurring",
  ]);
  if (headers.length === 0 || requiredHeaders.some((header) => !headers.includes(header))) {
    return {
      error: "CSV columns must include type, amount, category, and transaction_date.",
      code: "INVALID_CSV_COLUMNS",
    };
  }
  if (headers.some((header) => !allowedHeaders.has(header))) {
    return {
      error: "CSV contains unsupported columns. Use type, amount, category, transaction_date, description, and recurring.",
      code: "INVALID_CSV_COLUMNS",
    };
  }

  const structuralErrors = parsed.errors.filter(
    (parseError) => parseError.type !== "FieldMismatch",
  );
  if (structuralErrors.length > 0) {
    return { error: "CSV could not be parsed. Check its quoting and delimiters.", code: "INVALID_CSV" };
  }
  if (parsed.data.length === 0) {
    return { error: "CSV must contain at least one transaction row.", code: "EMPTY_CSV" };
  }
  if (parsed.data.length > MAX_CSV_ROWS) {
    return { error: `CSV may contain at most ${MAX_CSV_ROWS} transaction rows.`, code: "TOO_MANY_CSV_ROWS" };
  }

  const fieldMismatchRows = new Set(
    parsed.errors
      .filter((parseError) => parseError.type === "FieldMismatch" && Number.isInteger(parseError.row))
      .map((parseError) => parseError.row),
  );
  const validRows: CsvPreview["validRows"] = [];
  const invalidRows: CsvPreview["invalidRows"] = [];

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];
    if (fieldMismatchRows.has(index)) errors.push("Row has an inconsistent number of columns.");

    const rawType = (row.type ?? "").trim().toUpperCase();
    const type = rawType === "INCOME" || rawType === "EXPENSE" ? rawType : undefined;
    if (!type) errors.push("Type must be INCOME or EXPENSE.");

    const amountText = (row.amount ?? "").trim().replace(/^[\$₹€£\s]+/, "").replace(/,/g, "");
    const amount = Number(amountText);
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(amountText) ||
      !Number.isFinite(amount) ||
      amount < 0.01 ||
      amount > MAX_AMOUNT
    ) {
      errors.push("Amount must be a positive number with at most two decimal places.");
    }

    const category = (row.category ?? "").trim();
    if (!transactionCategories.includes(category as (typeof transactionCategories)[number])) {
      errors.push("Category is not supported.");
    } else if (type && !isCategoryForType(type, category)) {
      errors.push("Category does not match the transaction type.");
    }

    const transactionDate = (row.transaction_date ?? "").trim();
    if (!isValidIsoDate(transactionDate)) errors.push("Date must be a valid YYYY-MM-DD date.");

    const description = (row.description ?? "").trim();
    if (description.length > 500) errors.push("Description must be 500 characters or fewer.");

    const rawRecurring = (row.recurring ?? "").trim().toLowerCase();
    if (rawRecurring !== "" && rawRecurring !== "true" && rawRecurring !== "false") {
      errors.push("Recurring must be true or false.");
    }

    if (
      errors.length > 0 ||
      !type ||
      !Number.isFinite(amount) ||
      amount < 0.01 ||
      amount > MAX_AMOUNT ||
      !isValidIsoDate(transactionDate)
    ) {
      invalidRows.push({ rowNumber, errors });
      return;
    }

    validRows.push({
      rowNumber,
      transaction: {
        type,
        amount,
        category: category as (typeof transactionCategories)[number],
        description,
        transactionDate,
        recurring: rawRecurring === "true",
      },
    });
  });

  return {
    preview: {
      totalRows: parsed.data.length,
      acceptedRows: validRows.length,
      rejectedRows: invalidRows.length,
      canImport: validRows.length > 0 && invalidRows.length === 0,
      validRows,
      invalidRows,
    },
  };
}

function parseCsvBody(
  body: unknown,
  response: Response,
): { fileName: string; mimeType: string; csvText: string } | undefined {
  const parsed = csvInputSchema.safeParse(body);
  if (!parsed.success) {
    sendError(response, 400, "CSV import request is invalid.", "INVALID_CSV_REQUEST");
    return undefined;
  }
  return parsed.data;
}

async function getCsvPreview(
  body: unknown,
  response: Response,
): Promise<CsvPreview | undefined> {
  const input = parseCsvBody(body, response);
  if (!input) return undefined;
  const result = parseCsv(input.fileName, input.mimeType, input.csvText);
  if ("error" in result) {
    sendError(response, 400, result.error, result.code);
    return undefined;
  }
  return result.preview;
}

const refreshDashboardSummary = async (response: Response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
};

router.get("/transactions", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const parsedQuery = listQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    sendError(response, 400, "Transaction filters are invalid.", "INVALID_TRANSACTION_FILTERS");
    return;
  }
  const filters = parsedQuery.data;
  if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
    sendError(response, 400, "Start date must not be after end date.", "INVALID_DATE_RANGE");
    return;
  }

  const conditions: SQL[] = [eq(transactionsTable.userId, userId)];
  if (filters.search) {
    const pattern = `%${sanitizeLikePattern(filters.search)}%`;
    conditions.push(
      or(
        ilike(transactionsTable.description, pattern),
        ilike(sql<string>`${transactionsTable.category}::text`, pattern),
      )!,
    );
  }
  if (filters.type) conditions.push(eq(transactionsTable.type, filters.type));
  if (filters.category) conditions.push(eq(transactionsTable.category, filters.category));
  if (filters.fromDate) conditions.push(gte(transactionsTable.transactionDate, filters.fromDate));
  if (filters.toDate) conditions.push(lte(transactionsTable.transactionDate, filters.toDate));
  const where = and(...conditions);

  const sortColumn = {
    transactionDate: transactionsTable.transactionDate,
    amount: transactionsTable.amount,
    category: transactionsTable.category,
    createdAt: transactionsTable.createdAt,
  }[filters.sortBy];
  const orderBy = filters.sortOrder === "ASC" ? asc(sortColumn) : desc(sortColumn);
  const offset = (filters.page - 1) * filters.pageSize;

  try {
    const [countResult] = await db
      .select({ total: count() })
      .from(transactionsTable)
      .where(where);
    const rows = await db
      .select()
      .from(transactionsTable)
      .where(where)
      .orderBy(orderBy, desc(transactionsTable.id))
      .limit(filters.pageSize)
      .offset(offset);
    const total = countResult?.total ?? 0;
    response.setHeader("Cache-Control", "no-store");
    response.json({
      transactions: rows.map(serializeTransaction),
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
    });
  } catch {
    sendError(response, 500, "Transactions could not be loaded.", "TRANSACTION_LIST_FAILED");
  }
});

router.get("/transactions/summary", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const now = new Date();
  const asOfDate = now.toISOString().slice(0, 10);
  const currentMonth = formatMonth(now);
  const currentMonthStart = `${currentMonth}-01`;
  const nextMonthStart = `${formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)))}-01`;
  const firstTrendMonth = formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)));
  const firstTrendDate = `${firstTrendMonth}-01`;

  const monthExpression = sql<string>`to_char(${transactionsTable.transactionDate}::date, 'YYYY-MM')`;
  const incomeSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;
  const expenseSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;
  const categoryExpenseSum = sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`;

  try {
    const [profile] = await db
      .select({ currencyCode: financialProfilesTable.currencyCode })
      .from(financialProfilesTable)
      .where(eq(financialProfilesTable.userId, userId))
      .limit(1);
    const [allTime] = await db
      .select({
        income: incomeSum,
        expenses: expenseSum,
      })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));
    const monthRows = await db
      .select({
        month: monthExpression,
        income: incomeSum,
        expenses: expenseSum,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          gte(transactionsTable.transactionDate, firstTrendDate),
          lt(transactionsTable.transactionDate, nextMonthStart),
        ),
      )
      .groupBy(monthExpression)
      .orderBy(monthExpression);
    const categoryRows = await db
      .select({
        category: transactionsTable.category,
        amount: categoryExpenseSum,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.type, "EXPENSE"),
          gte(transactionsTable.transactionDate, currentMonthStart),
          lt(transactionsTable.transactionDate, nextMonthStart),
        ),
      )
      .groupBy(transactionsTable.category)
      .orderBy(desc(categoryExpenseSum));

    const monthTotals = new Map(
      monthRows.map((row) => [
        row.month,
        {
          income: toNumber(row.income),
          expenses: toNumber(row.expenses),
        },
      ]),
    );
    const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
      const month = formatMonth(monthDate);
      const totals = monthTotals.get(month) ?? { income: 0, expenses: 0 };
      return {
        month,
        income: totals.income,
        expenses: totals.expenses,
        netCashFlow: totals.income - totals.expenses,
      };
    });
    const currentTotals = monthTotals.get(currentMonth) ?? { income: 0, expenses: 0 };
    const totalIncome = toNumber(allTime?.income);
    const totalExpenses = toNumber(allTime?.expenses);

    response.setHeader("Cache-Control", "no-store");
    response.json({
      currencyCode: profile?.currencyCode ?? null,
      asOfDate,
      currentMonth,
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      currentMonthIncome: currentTotals.income,
      currentMonthExpenses: currentTotals.expenses,
      currentMonthNetCashFlow: currentTotals.income - currentTotals.expenses,
      monthlyTrend,
      currentMonthExpenseByCategory: categoryRows.map((row) => ({
        category: row.category,
        amount: toNumber(row.amount),
      })),
    });
  } catch (err) {
    request.log?.error({ err }, "Transaction totals calculation failed");
    sendError(response, 500, "Transaction totals could not be calculated.", "TRANSACTION_SUMMARY_FAILED");
  }
});

router.post(
  "/transactions",
  requireSameOrigin,
  requireAuthentication,
  async (request, response): Promise<void> => {
    const userId = getUserId(request, response);
    if (!userId) return;
    const parsed = transactionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      sendError(response, 400, "Transaction details are invalid.", "INVALID_TRANSACTION");
      return;
    }

    try {
      const [row] = await db
        .insert(transactionsTable)
        .values({
          userId,
          type: parsed.data.type,
          amount: parsed.data.amount.toFixed(2),
          category: parsed.data.category,
          description: parsed.data.description,
          transactionDate: parsed.data.transactionDate,
          recurring: parsed.data.recurring,
        })
        .returning();
      if (!row) {
        sendError(response, 500, "Transaction could not be saved.", "TRANSACTION_CREATE_FAILED");
        return;
      }
      response.status(201).json({ transaction: serializeTransaction(row) });
    } catch {
      sendError(response, 500, "Transaction could not be saved.", "TRANSACTION_CREATE_FAILED");
    }
  },
);

router.put(
  "/transactions/:transactionId",
  requireSameOrigin,
  requireAuthentication,
  async (request, response): Promise<void> => {
    const userId = getUserId(request, response);
    if (!userId) return;
    const transactionId = z.string().uuid().safeParse(request.params.transactionId);
    if (!transactionId.success) {
      sendError(response, 400, "Transaction ID is invalid.", "INVALID_TRANSACTION_ID");
      return;
    }
    const parsed = transactionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      sendError(response, 400, "Transaction details are invalid.", "INVALID_TRANSACTION");
      return;
    }

    try {
      const [row] = await db
        .update(transactionsTable)
        .set({
          type: parsed.data.type,
          amount: parsed.data.amount.toFixed(2),
          category: parsed.data.category,
          description: parsed.data.description,
          transactionDate: parsed.data.transactionDate,
          recurring: parsed.data.recurring,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactionsTable.id, transactionId.data),
            eq(transactionsTable.userId, userId),
          ),
        )
        .returning();
      if (!row) {
        sendError(response, 404, "Transaction was not found.", "TRANSACTION_NOT_FOUND");
        return;
      }
      response.json({ transaction: serializeTransaction(row) });
    } catch {
      sendError(response, 500, "Transaction could not be updated.", "TRANSACTION_UPDATE_FAILED");
    }
  },
);

router.delete(
  "/transactions/:transactionId",
  requireSameOrigin,
  requireAuthentication,
  async (request, response): Promise<void> => {
    const userId = getUserId(request, response);
    if (!userId) return;
    const transactionId = z.string().uuid().safeParse(request.params.transactionId);
    if (!transactionId.success) {
      sendError(response, 400, "Transaction ID is invalid.", "INVALID_TRANSACTION_ID");
      return;
    }

    try {
      const [deleted] = await db
        .delete(transactionsTable)
        .where(
          and(
            eq(transactionsTable.id, transactionId.data),
            eq(transactionsTable.userId, userId),
          ),
        )
        .returning({ id: transactionsTable.id });
      if (!deleted) {
        sendError(response, 404, "Transaction was not found.", "TRANSACTION_NOT_FOUND");
        return;
      }
      response.status(204).end();
    } catch {
      sendError(response, 500, "Transaction could not be deleted.", "TRANSACTION_DELETE_FAILED");
    }
  },
);

router.post(
  "/transactions/import/preview",
  requireSameOrigin,
  requireAuthentication,
  async (request, response): Promise<void> => {
    const userId = getUserId(request, response);
    if (!userId) return;
    const preview = await getCsvPreview(request.body, response);
    if (!preview) return;
    await refreshDashboardSummary(response);
    response.json(preview);
  },
);

router.post(
  "/transactions/import",
  requireSameOrigin,
  requireAuthentication,
  async (request, response): Promise<void> => {
    const userId = getUserId(request, response);
    if (!userId) return;
    const input = parseCsvBody(request.body, response);
    if (!input) return;
    const result = parseCsv(input.fileName, input.mimeType, input.csvText);
    if ("error" in result) {
      sendError(response, 400, result.error, result.code);
      return;
    }
    const preview = result.preview;
    if (!preview.canImport) {
      response.status(422).json(preview);
      return;
    }

    try {
      await db.transaction(async (transactionDb) => {
        await transactionDb.insert(transactionsTable).values(
          preview.validRows.map(({ transaction }) => ({
            userId,
            type: transaction.type,
            amount: transaction.amount.toFixed(2),
            category: transaction.category,
            description: transaction.description,
            transactionDate: transaction.transactionDate,
            recurring: transaction.recurring,
          })),
        );
      });
      response.json({ importedCount: preview.acceptedRows, totalRows: preview.totalRows });
    } catch {
      sendError(response, 500, "CSV transactions were not imported.", "TRANSACTION_IMPORT_FAILED");
    }
  },
);

export default router;
