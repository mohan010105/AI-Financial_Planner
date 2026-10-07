CREATE TYPE "public"."transaction_category" AS ENUM('Salary', 'Freelance', 'Business', 'Housing', 'Food', 'Transport', 'Healthcare', 'Education', 'Shopping', 'Entertainment', 'Utilities', 'EMI/Loans', 'Subscriptions', 'Other');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"category" "transaction_category" NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"transaction_date" date NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_positive_check" CHECK ("transactions"."amount" > 0 AND "transactions"."amount" <= 999999999999.99),
	CONSTRAINT "transactions_category_matches_type_check" CHECK ((
        ("transactions"."type" = 'INCOME' AND "transactions"."category" IN ('Salary', 'Freelance', 'Business', 'Other'))
        OR
        ("transactions"."type" = 'EXPENSE' AND "transactions"."category" IN ('Housing', 'Food', 'Transport', 'Healthcare', 'Education', 'Shopping', 'Entertainment', 'Utilities', 'EMI/Loans', 'Subscriptions', 'Other'))
      ))
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_owner_date_idx" ON "transactions" USING btree ("user_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_owner_type_date_idx" ON "transactions" USING btree ("user_id","type","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_owner_category_date_idx" ON "transactions" USING btree ("user_id","category","transaction_date");