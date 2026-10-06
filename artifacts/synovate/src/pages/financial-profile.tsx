import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, type FieldError, type UseFormRegister } from "react-hook-form";
import {
  FinancialProfileInputAgeRange,
  FinancialProfileInputEmploymentStatus,
  FinancialProfileInputPlanningHorizon,
  FinancialProfileInputPrimaryGoal,
  getGetAuthSessionQueryKey,
  getGetFinancialProfileQueryKey,
  useGetFinancialProfile,
  useUpdateFinancialProfile,
  type FinancialProfile,
  type FinancialProfileInput,
} from "@workspace/api-client-react";
import { Form } from "@/components/ui/form";
import { Button, Card, ErrorState, Input, Loading } from "@/components/ui-kit";

const initialValues = {
  name: "",
  currencyCode: "",
} satisfies Partial<FinancialProfileInput>;

type MoneyFieldName =
  | "monthlyIncome"
  | "existingSavings"
  | "monthlyFixedExpenses"
  | "monthlyVariableExpenses"
  | "monthlyLoanPayments"
  | "emergencyFundAmount";

const ageLabels: Record<FinancialProfileInput["ageRange"], string> = {
  "18-24": "18–24",
  "25-34": "25–34",
  "35-44": "35–44",
  "45-54": "45–54",
  "55-64": "55–64",
  "65+": "65 or older",
};

const employmentLabels: Record<FinancialProfileInput["employmentStatus"], string> = {
  employed: "Employed",
  self_employed: "Self-employed",
  unemployed: "Unemployed",
  student: "Student",
  retired: "Retired",
  other: "Other",
};

const goalLabels: Record<FinancialProfileInput["primaryGoal"], string> = {
  emergency_fund: "Build an emergency fund",
  debt_repayment: "Pay down debt",
  home_purchase: "Save for a home",
  education: "Plan for education",
  retirement: "Plan for retirement",
  long_term_savings: "Grow long-term savings",
  other: "Other",
};

const horizonLabels: Record<FinancialProfileInput["planningHorizon"], string> = {
  under_1_year: "Under 1 year",
  "1_to_3_years": "1–3 years",
  "3_to_5_years": "3–5 years",
  "5_plus_years": "5+ years",
};

const currencies = [
  ["INR", "INR — Indian rupee"],
  ["USD", "USD — US dollar"],
  ["EUR", "EUR — euro"],
  ["GBP", "GBP — pound sterling"],
  ["CAD", "CAD — Canadian dollar"],
  ["AUD", "AUD — Australian dollar"],
  ["JPY", "JPY — Japanese yen"],
] as const;

function toFormValues(profile: FinancialProfile): FinancialProfileInput {
  return {
    name: profile.name,
    ageRange: profile.ageRange,
    employmentStatus: profile.employmentStatus,
    currencyCode: profile.currencyCode,
    monthlyIncome: profile.monthlyIncome,
    existingSavings: profile.existingSavings,
    monthlyFixedExpenses: profile.monthlyFixedExpenses,
    monthlyVariableExpenses: profile.monthlyVariableExpenses,
    monthlyLoanPayments: profile.monthlyLoanPayments,
    emergencyFundAmount: profile.emergencyFundAmount,
    primaryGoal: profile.primaryGoal,
    planningHorizon: profile.planningHorizon,
  };
}

function amountRules(maximum: number) {
  return {
    valueAsNumber: true,
    required: "Enter an amount, or enter 0 if it does not apply.",
    min: { value: 0, message: "Amount cannot be negative." },
    max: { value: maximum, message: "Amount is above the allowed limit." },
    validate: {
      finite: (value: number) => Number.isFinite(value) || "Enter a valid amount.",
      cents: (value: number) =>
        !Number.isFinite(value) ||
        Math.abs(value * 100 - Math.round(value * 100)) < 0.000001 ||
        "Use no more than two decimal places.",
    },
  };
}

function MoneyField({
  name,
  label,
  maximum,
  register,
  error,
  helper,
}: {
  name: MoneyFieldName;
  label: string;
  maximum: number;
  register: UseFormRegister<FinancialProfileInput>;
  error?: FieldError;
  helper?: string;
}) {
  return (
    <div className="profile-field">
      <Input
        label={label}
        type="number"
        inputMode="decimal"
        min={0}
        max={maximum}
        step="0.01"
        autoComplete="off"
        aria-invalid={!!error}
        data-testid={`input-${name}`}
        {...register(name, amountRules(maximum))}
      />
      {helper && <p className="field-hint">{helper}</p>}
      {error?.message && <p className="field-error" role="alert" data-testid={`error-${name}`}>{error.message}</p>}
    </div>
  );
}

export default function FinancialProfilePage() {
  const queryClient = useQueryClient();
  const profileQuery = useGetFinancialProfile({
    query: { queryKey: getGetFinancialProfileQueryKey(), retry: false },
  });
  const saveProfile = useUpdateFinancialProfile();
  const form = useForm<FinancialProfileInput>({ defaultValues: initialValues });

  useEffect(() => {
    if (!profileQuery.isSuccess || form.formState.isDirty) return;
    form.reset(profileQuery.data.profile ? toFormValues(profileQuery.data.profile) : initialValues);
  }, [profileQuery.data, profileQuery.isSuccess, form.formState.isDirty, form.reset]);

  function onSubmit(values: FinancialProfileInput): void {
    saveProfile.mutate(
      { data: values },
      {
        onSuccess: (result) => {
          queryClient.setQueryData(getGetFinancialProfileQueryKey(), result);
          void queryClient.invalidateQueries({ queryKey: getGetAuthSessionQueryKey() });
          if (result.profile) form.reset(toFormValues(result.profile));
        },
      },
    );
  }

  if (profileQuery.isLoading) return <Loading label="Loading your financial profile" />;
  if (profileQuery.isError) {
    return <ErrorState onRetry={() => { void profileQuery.refetch(); }} />;
  }

  const savedProfile = profileQuery.data?.profile ?? null;
  const errors = form.formState.errors;
  const isSaving = saveProfile.isPending;

  return (
    <div className="profile-page">
      <div className="page-intro profile-intro">
        <div>
          <div className="eyebrow">YOUR FINANCIAL PROFILE <span className="eyebrow-line" /></div>
          <h1>Your details, <em>on your terms.</em></h1>
          <p>Keep the information you choose to share in one private place. You can update it at any time.</p>
        </div>
      </div>

      <Card className="profile-form-card">
        <div className="profile-form-heading">
          <div>
            <span className="chart-kicker">PERSONAL FINANCIAL PROFILE</span>
            <h2>{savedProfile ? "Update your information" : "Set up your profile"}</h2>
          </div>
          <span className="profile-private-note">Private to your account</span>
        </div>
        <p className="profile-form-intro">
          SYNOVATE saves these details to your account. Amounts are not used for financial-health scores or recommendations in this phase.
        </p>

        <Form {...form}>
          <form className="profile-form" onSubmit={form.handleSubmit(onSubmit)} noValidate autoComplete="off">
            <fieldset className="profile-section">
              <legend>Personal</legend>
              <div className="profile-fields profile-fields-three">
                <div className="profile-field">
                  <Input
                    label="Name"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    aria-invalid={!!errors.name}
                    data-testid="input-name"
                    {...form.register("name", {
                      required: "Enter your name.",
                      maxLength: { value: 120, message: "Name must be 120 characters or fewer." },
                      validate: (value) => value.trim().length > 0 || "Enter your name.",
                    })}
                  />
                  {errors.name?.message && <p className="field-error" role="alert" data-testid="error-name">{errors.name.message}</p>}
                </div>
                <div className="profile-field">
                  <label className="field-wrap">
                    <span className="field-label">Age range</span>
                    <select className="field-input" defaultValue="" data-testid="select-age-range" aria-invalid={!!errors.ageRange} {...form.register("ageRange", { required: "Choose an age range." })}>
                      <option value="" disabled>Select age range</option>
                      {Object.values(FinancialProfileInputAgeRange).map((value) => <option value={value} key={value}>{ageLabels[value]}</option>)}
                    </select>
                  </label>
                  {errors.ageRange?.message && <p className="field-error" role="alert" data-testid="error-age-range">{errors.ageRange.message}</p>}
                </div>
                <div className="profile-field">
                  <label className="field-wrap">
                    <span className="field-label">Employment status</span>
                    <select className="field-input" defaultValue="" data-testid="select-employment-status" aria-invalid={!!errors.employmentStatus} {...form.register("employmentStatus", { required: "Choose an employment status." })}>
                      <option value="" disabled>Select status</option>
                      {Object.values(FinancialProfileInputEmploymentStatus).map((value) => <option value={value} key={value}>{employmentLabels[value]}</option>)}
                    </select>
                  </label>
                  {errors.employmentStatus?.message && <p className="field-error" role="alert" data-testid="error-employment-status">{errors.employmentStatus.message}</p>}
                </div>
              </div>
            </fieldset>

            <fieldset className="profile-section">
              <legend>Financial</legend>
              <div className="profile-fields profile-fields-three">
                <div className="profile-field">
                  <label className="field-wrap">
                    <span className="field-label">Currency used for amounts</span>
                    <select className="field-input" defaultValue="" data-testid="select-currency" aria-invalid={!!errors.currencyCode} {...form.register("currencyCode", { required: "Choose a currency.", pattern: { value: /^[A-Z]{3}$/, message: "Choose a supported currency." } })}>
                      <option value="" disabled>Select currency</option>
                      {currencies.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select>
                  </label>
                  {errors.currencyCode?.message && <p className="field-error" role="alert" data-testid="error-currency">{errors.currencyCode.message}</p>}
                </div>
                <MoneyField name="monthlyIncome" label="Monthly income" maximum={100000000} register={form.register} error={errors.monthlyIncome} />
                <MoneyField name="existingSavings" label="Existing savings" maximum={999999999999.99} register={form.register} error={errors.existingSavings} />
                <MoneyField name="monthlyFixedExpenses" label="Monthly fixed expenses" maximum={100000000} register={form.register} error={errors.monthlyFixedExpenses} />
                <MoneyField name="monthlyVariableExpenses" label="Monthly variable expenses" maximum={100000000} register={form.register} error={errors.monthlyVariableExpenses} />
                <MoneyField name="monthlyLoanPayments" label="Existing loans / EMIs" maximum={100000000} register={form.register} error={errors.monthlyLoanPayments} helper="Monthly payments; enter 0 if there are none." />
                <MoneyField name="emergencyFundAmount" label="Emergency fund amount" maximum={999999999999.99} register={form.register} error={errors.emergencyFundAmount} />
              </div>
            </fieldset>

            <fieldset className="profile-section">
              <legend>Planning</legend>
              <div className="profile-fields profile-fields-two">
                <div className="profile-field">
                  <label className="field-wrap">
                    <span className="field-label">Primary financial goal</span>
                    <select className="field-input" defaultValue="" data-testid="select-primary-goal" aria-invalid={!!errors.primaryGoal} {...form.register("primaryGoal", { required: "Choose a primary goal." })}>
                      <option value="" disabled>Select a goal</option>
                      {Object.values(FinancialProfileInputPrimaryGoal).map((value) => <option value={value} key={value}>{goalLabels[value]}</option>)}
                    </select>
                  </label>
                  {errors.primaryGoal?.message && <p className="field-error" role="alert" data-testid="error-primary-goal">{errors.primaryGoal.message}</p>}
                </div>
                <div className="profile-field">
                  <label className="field-wrap">
                    <span className="field-label">Preferred planning horizon</span>
                    <select className="field-input" defaultValue="" data-testid="select-planning-horizon" aria-invalid={!!errors.planningHorizon} {...form.register("planningHorizon", { required: "Choose a planning horizon." })}>
                      <option value="" disabled>Select a horizon</option>
                      {Object.values(FinancialProfileInputPlanningHorizon).map((value) => <option value={value} key={value}>{horizonLabels[value]}</option>)}
                    </select>
                  </label>
                  {errors.planningHorizon?.message && <p className="field-error" role="alert" data-testid="error-planning-horizon">{errors.planningHorizon.message}</p>}
                </div>
              </div>
            </fieldset>

            {saveProfile.error && <p className="form-error" role="alert" data-testid="error-profile-save">{saveProfile.error.message}</p>}
            {saveProfile.isSuccess && <p className="form-success" role="status" data-testid="status-profile-saved">Your financial profile is saved.</p>}
            <div className="profile-form-actions">
              <span>All amounts can be zero where they do not apply.</span>
              <Button type="submit" disabled={isSaving} data-testid="button-save-profile">{isSaving ? "Saving…" : "Save profile"}</Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
