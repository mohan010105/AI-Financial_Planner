import { DataType, newDb } from "pg-mem";
import crypto from "node:crypto";
import type pg from "pg";

export function createMemoryPool(): pg.Pool {
  const memDb = newDb();

  // Register gen_random_uuid native function as impure so it produces a fresh UUID per row
  memDb.public.registerFunction({
    name: "gen_random_uuid",
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  // Register to_char native function for formatting dates/timestamps in queries
  const formatToChar = (val: any, format: string) => {
    if (!val) return null;
    const d = typeof val === "string" || typeof val === "number" ? new Date(val) : val;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      return String(val).slice(0, 7);
    }
    if (format === "YYYY-MM") {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }
    return d.toISOString().slice(0, 7);
  };

  for (const dateType of [DataType.date, DataType.timestamp, DataType.timestamptz, DataType.text]) {
    try {
      memDb.public.registerFunction({
        name: "to_char",
        args: [dateType, DataType.text],
        returns: DataType.text,
        implementation: formatToChar,
      });
    } catch {
      // Ignore if type is not available in pg-mem or duplicate overload
    }
  }

  // Enable pg-mem postgres adapter
  const pgAdapter = memDb.adapters.createPg();
  const rawPool = new pgAdapter.Pool() as unknown as pg.Pool;

  function wrapQuery(origQueryFn: any) {
    return function (textOrConfig: any, ...args: any[]) {
      let wasRowModeArray = false;
      if (textOrConfig && typeof textOrConfig === "object") {
        delete textOrConfig.types;
        if (textOrConfig.rowMode === "array") {
          wasRowModeArray = true;
          delete textOrConfig.rowMode;
        }
      }

      const transform = (res: any) => {
        if (wasRowModeArray && res && Array.isArray(res.rows)) {
          const fields = res.fields;
          if (Array.isArray(fields) && fields.length > 0) {
            res.rows = res.rows.map((row: any) => fields.map((f: any) => row[f.name]));
          } else {
            res.rows = res.rows.map((row: any) => Object.values(row));
          }
        }
        return res;
      };

      const lastArg = args[args.length - 1];
      if (typeof lastArg === "function") {
        const origCb = lastArg;
        args[args.length - 1] = (err: any, res: any) => {
          if (!err) transform(res);
          return origCb(err, res);
        };
        return origQueryFn(textOrConfig, ...args);
      }

      const queryPromise = origQueryFn(textOrConfig, ...args);
      if (queryPromise && typeof queryPromise.then === "function") {
        return queryPromise.then(transform);
      }
      return queryPromise;
    };
  }

  rawPool.query = wrapQuery(rawPool.query.bind(rawPool));

  const origPoolConnect = rawPool.connect.bind(rawPool);
  (rawPool as any).connect = (async function (...args: any[]) {
    const client: any = await (origPoolConnect as any)(...args);
    if (client && client.query) {
      client.query = wrapQuery(client.query.bind(client));
    }
    return client;
  }) as any;

  const pool = rawPool;

  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS "profiles" (
      "user_id" uuid PRIMARY KEY NOT NULL,
      "display_name" varchar(120),
      "locale" varchar(35),
      "time_zone" varchar(100),
      "currency_code" varchar(3),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "auth_provider" varchar(40) NOT NULL,
      "auth_subject" text NOT NULL,
      "email" varchar(320) NOT NULL,
      "password_hash" varchar(180) NOT NULL DEFAULT '',
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "financial_profiles" (
      "user_id" uuid PRIMARY KEY NOT NULL,
      "name" varchar(120) NOT NULL,
      "age_range" varchar(20) NOT NULL,
      "employment_status" varchar(30) NOT NULL,
      "currency_code" varchar(3) NOT NULL,
      "monthly_income" numeric(14, 2) NOT NULL,
      "existing_savings" numeric(14, 2) NOT NULL,
      "monthly_fixed_expenses" numeric(14, 2) NOT NULL,
      "monthly_variable_expenses" numeric(14, 2) NOT NULL,
      "monthly_loan_payments" numeric(14, 2) NOT NULL,
      "emergency_fund_amount" numeric(14, 2) NOT NULL,
      "primary_goal" varchar(40) NOT NULL,
      "planning_horizon" varchar(40) NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "sessions" (
      "session_id" varchar(64) PRIMARY KEY NOT NULL,
      "user_id" uuid NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "transactions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "type" varchar(20) NOT NULL,
      "amount" numeric(14, 2) NOT NULL,
      "category" varchar(40) NOT NULL,
      "description" varchar(500) DEFAULT '' NOT NULL,
      "transaction_date" date NOT NULL,
      "recurring" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "financial_goals" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "name" varchar(120) NOT NULL,
      "type" varchar(40) NOT NULL,
      "target_amount" numeric(14, 2) NOT NULL,
      "current_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
      "target_date" date NOT NULL,
      "priority" varchar(20) DEFAULT 'medium' NOT NULL,
      "notes" varchar(1000) DEFAULT '' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "goal_contributions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "goal_id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "amount" numeric(14, 2) NOT NULL,
      "contribution_date" date NOT NULL,
      "notes" varchar(255) DEFAULT '' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_identity_unique" ON "users" ("auth_provider","auth_subject");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");`,
    `CREATE INDEX IF NOT EXISTS "financial_profiles_updated_at_idx" ON "financial_profiles" ("updated_at");`,
    `CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" ("expires_at");`,
    `CREATE INDEX IF NOT EXISTS "transactions_owner_date_idx" ON "transactions" ("user_id","transaction_date");`,
    `CREATE INDEX IF NOT EXISTS "transactions_owner_type_date_idx" ON "transactions" ("user_id","type","transaction_date");`,
    `CREATE INDEX IF NOT EXISTS "transactions_owner_category_date_idx" ON "transactions" ("user_id","category","transaction_date");`,
    `CREATE INDEX IF NOT EXISTS "goals_owner_target_date_idx" ON "financial_goals" ("user_id","target_date");`,
    `CREATE INDEX IF NOT EXISTS "goals_owner_priority_idx" ON "financial_goals" ("user_id","priority");`,
    `CREATE INDEX IF NOT EXISTS "contributions_goal_date_idx" ON "goal_contributions" ("goal_id","contribution_date");`,
    `CREATE INDEX IF NOT EXISTS "contributions_owner_date_idx" ON "goal_contributions" ("user_id","contribution_date");`,
    `CREATE TABLE IF NOT EXISTS "subscription_plans" (
      "id" varchar(50) PRIMARY KEY NOT NULL,
      "tier" varchar(20) NOT NULL,
      "name" varchar(100) NOT NULL,
      "billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
      "price" numeric(14, 2) DEFAULT '0' NOT NULL,
      "currency" varchar(10) DEFAULT 'INR' NOT NULL,
      "razorpay_plan_id" varchar(100),
      "description" text DEFAULT '' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "user_subscriptions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "tier" varchar(20) DEFAULT 'FREE' NOT NULL,
      "billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
      "status" varchar(30) DEFAULT 'active' NOT NULL,
      "razorpay_subscription_id" varchar(100),
      "razorpay_plan_id" varchar(100),
      "current_period_start" timestamp with time zone,
      "current_period_end" timestamp with time zone,
      "cancel_at_period_end" boolean DEFAULT false NOT NULL,
      "cancelled_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "payment_transactions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "user_subscription_id" uuid,
      "razorpay_payment_id" varchar(100) NOT NULL,
      "razorpay_order_id" varchar(100),
      "razorpay_subscription_id" varchar(100),
      "amount" numeric(14, 2) NOT NULL,
      "currency" varchar(10) DEFAULT 'INR' NOT NULL,
      "status" varchar(30) NOT NULL,
      "method" varchar(50),
      "tier" varchar(20) NOT NULL,
      "billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
      "error_code" varchar(100),
      "error_description" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "webhook_events" (
      "id" varchar(100) PRIMARY KEY NOT NULL,
      "event_type" varchar(100) NOT NULL,
      "status" varchar(30) DEFAULT 'processed' NOT NULL,
      "payload" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_user_id_unique" ON "user_subscriptions" ("user_id");`,
    `CREATE INDEX IF NOT EXISTS "user_subscriptions_status_idx" ON "user_subscriptions" ("status");`,
    `CREATE INDEX IF NOT EXISTS "user_subscriptions_rzp_sub_idx" ON "user_subscriptions" ("razorpay_subscription_id");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_rzp_payment_id_unique" ON "payment_transactions" ("razorpay_payment_id");`,
    `CREATE INDEX IF NOT EXISTS "payment_transactions_user_id_idx" ON "payment_transactions" ("user_id");`,
    `CREATE INDEX IF NOT EXISTS "payment_transactions_order_id_idx" ON "payment_transactions" ("razorpay_order_id");`,
    `CREATE INDEX IF NOT EXISTS "webhook_events_event_type_idx" ON "webhook_events" ("event_type");`
  ];

  for (const statement of sqlStatements) {
    try {
      memDb.public.none(statement);
    } catch (e) {
      console.warn("Table initialization warning:", e);
    }
  }

  return pool;
}
