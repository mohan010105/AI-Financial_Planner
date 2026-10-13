import { and, eq, sql } from "drizzle-orm";
import {
  db,
  financialGoalsTable,
  financialProfilesTable,
  goalContributionsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { switchUserSubscription } from "./subscription";

export const DEMO_USER_EMAIL = "demo@synovate.local";

/**
 * Generates synthetic transaction dates across past 4 months relative to current date
 */
function getDateForMonth(monthsAgo: number, dayOfMonth: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.min(dayOfMonth, 28));
  return d.toISOString().slice(0, 10);
}

function getFutureDate(monthsAhead: number, dayOfMonth = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  d.setDate(dayOfMonth);
  return d.toISOString().slice(0, 10);
}

/**
 * Seeds or resets the synthetic demo dataset for a specific user ID.
 * DEMO DATA IS CLEARLY IDENTIFIED AND NEVER OVERWRITES UNRELATED USER RECORDS.
 */
export async function seedDemoDataForUser(userId: string): Promise<{ success: boolean; transactionCount: number; goalCount: number }> {
  // 1. Clean existing records for THIS user only
  await db.delete(goalContributionsTable).where(eq(goalContributionsTable.userId, userId));
  await db.delete(financialGoalsTable).where(eq(financialGoalsTable.userId, userId));
  await db.delete(transactionsTable).where(eq(transactionsTable.userId, userId));
  await db.delete(financialProfilesTable).where(eq(financialProfilesTable.userId, userId));

  // 2. Insert Synthetic Financial Profile
  // Income: ₹60,000 | Fixed Expenses: ₹25,000 | Variable: ₹17,000 (Total ₹42,000) | Net Surplus: ₹18,000
  await db.insert(financialProfilesTable).values({
    userId,
    name: "Aarav Sharma (Demo)",
    currencyCode: "INR",
    ageRange: "25-34",
    employmentStatus: "employed",
    monthlyIncome: "60000.00",
    monthlyFixedExpenses: "25000.00",
    monthlyVariableExpenses: "17000.00",
    monthlyLoanPayments: "0.00",
    existingSavings: "50000.00",
    emergencyFundAmount: "50000.00",
    primaryGoal: "emergency_fund",
    planningHorizon: "under_1_year",
  });

  // 3. Generate 4 Months of Realistic Transactions (Month -3, -2, -1, 0)
  // Each month: ₹60,000 Income vs ₹42,000 Expenses = ₹18,000 Surplus
  const syntheticTransactions: Array<{
    userId: string;
    type: "INCOME" | "EXPENSE";
    amount: string;
    category:
      | "Salary"
      | "Housing"
      | "Food"
      | "Transport"
      | "Healthcare"
      | "Utilities"
      | "Subscriptions"
      | "Shopping"
      | "Entertainment";
    description: string;
    transactionDate: string;
    recurring: boolean;
  }> = [];

  for (let m = 3; m >= 0; m--) {
    // 1st: Monthly Salary
    syntheticTransactions.push({
      userId,
      type: "INCOME",
      amount: "60000.00",
      category: "Salary",
      description: "Monthly Technology Salary Credit (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 1),
      recurring: true,
    });

    // 2nd: Housing / Apartment Rent (Fixed)
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "18000.00",
      category: "Housing",
      description: "Apartment Rent & Society Maintenance (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 2),
      recurring: true,
    });

    // 5th: Utilities
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "3500.00",
      category: "Utilities",
      description: "Electricity & Fiber Broadband (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 5),
      recurring: true,
    });

    // 8th: Subscriptions
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "1200.00",
      category: "Subscriptions",
      description: "Cloud Storage & Media Subscriptions (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 8),
      recurring: true,
    });

    // 10th: Groceries (Food)
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "4200.00",
      category: "Food",
      description: "Supermarket Household Groceries (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 10),
      recurring: false,
    });

    // 14th: Transport (Fuel & Metro)
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "2100.00",
      category: "Transport",
      description: "Metro Smart Card & Commute Fuel (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 14),
      recurring: false,
    });

    // 18th: Food & Dining
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "3600.00",
      category: "Food",
      description: "Weekly Fresh Supplies & Casual Dining (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 18),
      recurring: false,
    });

    // 22nd: Healthcare
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "1800.00",
      category: "Healthcare",
      description: "Health Insurance & Preventive Pharmacy (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 22),
      recurring: false,
    });

    // 25th: Transport
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "1900.00",
      category: "Transport",
      description: "City Transit & Ride-hailing (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 25),
      recurring: false,
    });

    // 27th: Food
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "2700.00",
      category: "Food",
      description: "Artisan Pantry & Coffee (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 27),
      recurring: false,
    });

    // 28th: Shopping & Apparel
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "2000.00",
      category: "Shopping",
      description: "Work Apparel & Home Essentials (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 28),
      recurring: false,
    });

    // 29th: Entertainment
    syntheticTransactions.push({
      userId,
      type: "EXPENSE",
      amount: "1000.00",
      category: "Entertainment",
      description: "Weekend Cinema & Social Activities (Synthetic Demo)",
      transactionDate: getDateForMonth(m, 28),
      recurring: false,
    });
  }

  await db.insert(transactionsTable).values(syntheticTransactions);

  // 4. Insert 3 Financial Goals
  // Primary Goal matches prompt: Target: ₹2,00,000 | Current: ₹50,000 | 10 months away
  const [goal1] = await db
    .insert(financialGoalsTable)
    .values({
      userId,
      name: "Emergency Fund (Demo)",
      type: "emergency_fund",
      targetAmount: "200000.00",
      currentAmount: "50000.00",
      targetDate: getFutureDate(10),
      priority: "high",
      notes: "6 months essential living expenses liquidity reserve (Synthetic Demo Data)",
    })
    .returning({ id: financialGoalsTable.id });

  const [goal2] = await db
    .insert(financialGoalsTable)
    .values({
      userId,
      name: "Higher Education & Certifications (Demo)",
      type: "education",
      targetAmount: "500000.00",
      currentAmount: "150000.00",
      targetDate: getFutureDate(24),
      priority: "medium",
      notes: "Advanced Fintech & Data Science certification tuition (Synthetic Demo Data)",
    })
    .returning({ id: financialGoalsTable.id });

  await db.insert(financialGoalsTable).values({
    userId,
    name: "Tech Workstation Upgrade (Demo)",
    type: "major_purchase",
    targetAmount: "80000.00",
    currentAmount: "45000.00",
    targetDate: getFutureDate(5),
    priority: "low",
    notes: "High-performance developer laptop and ergonomic monitor (Synthetic Demo Data)",
  });

  // 5. Insert Goal Contributions for history
  await db.insert(goalContributionsTable).values([
    {
      goalId: goal1.id,
      userId,
      amount: "15000.00",
      contributionDate: getDateForMonth(1, 2),
      notes: "Automatic monthly savings transfer (Synthetic Demo)",
    },
    {
      goalId: goal1.id,
      userId,
      amount: "15000.00",
      contributionDate: getDateForMonth(0, 2),
      notes: "Automatic monthly savings transfer (Synthetic Demo)",
    },
    {
      goalId: goal2.id,
      userId,
      amount: "10000.00",
      contributionDate: getDateForMonth(0, 5),
      notes: "Quarterly education milestone transfer (Synthetic Demo)",
    },
  ]);

  // 6. Ensure Demo User has PREMIUM subscription active so all hackathon features unlock
  switchUserSubscription(userId, "PREMIUM");

  return {
    success: true,
    transactionCount: syntheticTransactions.length,
    goalCount: 3,
  };
}

/**
 * Gets or creates the dedicated demo user account
 */
export async function getOrCreateDemoUser(): Promise<{ id: string; email: string }> {
  const [existing] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, DEMO_USER_EMAIL))
    .limit(1);

  if (existing) {
    return existing;
  }

  // Create demo user account
  const [created] = await db
    .insert(usersTable)
    .values({
      email: DEMO_USER_EMAIL,
      authProvider: "local",
      authSubject: DEMO_USER_EMAIL,
      passwordHash: "demo-account-locked-no-direct-password-login",
    })
    .returning({ id: usersTable.id, email: usersTable.email });

  return created;
}
