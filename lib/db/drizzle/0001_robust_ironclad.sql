CREATE TYPE "public"."age_range" AS ENUM('18-24', '25-34', '35-44', '45-54', '55-64', '65+');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('employed', 'self_employed', 'unemployed', 'student', 'retired', 'other');--> statement-breakpoint
CREATE TYPE "public"."financial_goal" AS ENUM('emergency_fund', 'debt_repayment', 'home_purchase', 'education', 'retirement', 'long_term_savings', 'other');--> statement-breakpoint
CREATE TYPE "public"."planning_horizon" AS ENUM('under_1_year', '1_to_3_years', '3_to_5_years', '5_plus_years');--> statement-breakpoint
CREATE TABLE "financial_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"age_range" "age_range" NOT NULL,
	"employment_status" "employment_status" NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"monthly_income" numeric(14, 2) NOT NULL,
	"existing_savings" numeric(14, 2) NOT NULL,
	"monthly_fixed_expenses" numeric(14, 2) NOT NULL,
	"monthly_variable_expenses" numeric(14, 2) NOT NULL,
	"monthly_loan_payments" numeric(14, 2) NOT NULL,
	"emergency_fund_amount" numeric(14, 2) NOT NULL,
	"primary_goal" "financial_goal" NOT NULL,
	"planning_horizon" "planning_horizon" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_profiles_monthly_amounts_check" CHECK ("financial_profiles"."monthly_income" BETWEEN 0 AND 100000000
        AND "financial_profiles"."monthly_fixed_expenses" BETWEEN 0 AND 100000000
        AND "financial_profiles"."monthly_variable_expenses" BETWEEN 0 AND 100000000
        AND "financial_profiles"."monthly_loan_payments" BETWEEN 0 AND 100000000),
	CONSTRAINT "financial_profiles_savings_amounts_check" CHECK ("financial_profiles"."existing_savings" BETWEEN 0 AND 999999999999.99
        AND "financial_profiles"."emergency_fund_amount" BETWEEN 0 AND 999999999999.99)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(180) NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_profiles_updated_at_idx" ON "financial_profiles" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");