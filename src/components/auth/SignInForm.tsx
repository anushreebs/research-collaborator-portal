import { t } from "../../locales";

export function SignInForm({
  role,
  password,
  onPasswordChange,
  onSubmit,
  submitting,
}: {
  role: "researcher" | "admin";
  password: string;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <form
      className="form sign-in-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h1>{t("auth.heading")}</h1>
      <label htmlFor="password">{t("auth.passwordLabel", { role })}</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
      />
      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? t("common.signingIn") : t("common.signIn")}
      </button>
      <small>{t("auth.warning")}</small>
    </form>
  );
}
