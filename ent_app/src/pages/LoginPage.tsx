import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";
import { useWander } from "../wander-state";

type AuthMode = "login" | "register" | "reset";

type RememberedAuth = {
  email: string;
  password: string;
  rememberAccount: boolean;
  rememberPassword: boolean;
};

const rememberStorageKey = "wander-auth-remember";
const minPasswordLength = 7;

export function LoginPage() {
  const { language } = useLanguage();
  const { login, register, resetPassword } = useWander();
  const navigate = useNavigate();
  const labels = buildAuthLabels(language);
  const remembered = readRememberedAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(remembered.email);
  const [password, setPassword] = useState(remembered.password);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberAccount, setRememberAccount] = useState(remembered.rememberAccount);
  const [rememberPassword, setRememberPassword] = useState(remembered.rememberPassword);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const safeEmail = email.trim();
    const safePassword = password.trim();

    if (!safeEmail) {
      setError(labels.emailRequired);
      return;
    }

    if (safePassword.length < minPasswordLength) {
      setError(labels.passwordRule);
      return;
    }

    if ((mode === "register" || mode === "reset") && safePassword !== confirmPassword.trim()) {
      setError(labels.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    const result =
      mode === "register"
        ? await register({
            email: safeEmail,
            name: "Wander User",
            password: safePassword,
          })
        : mode === "reset"
          ? await resetPassword({
              email: safeEmail,
              password: safePassword,
            })
          : await login({
              email: safeEmail,
              password: safePassword,
            });

    setIsSubmitting(false);
    if (!result.ok) {
      setError(getAuthErrorMessage(mode, result.reason, labels));
      return;
    }

    writeRememberedAuth({
      email: rememberAccount || rememberPassword ? safeEmail : "",
      password: rememberPassword ? safePassword : "",
      rememberAccount,
      rememberPassword,
    });
    setError("");
    navigate(mode === "register" ? "/onboarding" : "/", { replace: true });
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setConfirmPassword("");
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <span className="eyebrow">Wander</span>
          <h1>{mode === "register" ? labels.registerTitle : mode === "reset" ? labels.resetTitle : labels.title}</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-mode-tabs">
            <button
              className={mode === "login" ? "is-active" : ""}
              type="button"
              onClick={() => switchMode("login")}
            >
              {labels.login}
            </button>
            <button
              className={mode === "register" ? "is-active" : ""}
              type="button"
              onClick={() => switchMode("register")}
            >
              {labels.register}
            </button>
          </div>

          <label className="auth-field">
            <span>{labels.email}</span>
            <input
              value={email}
              inputMode="email"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="auth-field">
            <span>{labels.password}</span>
            <input
              value={password}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {mode === "register" || mode === "reset" ? (
            <label className="auth-field">
              <span>{labels.confirmPassword}</span>
              <input
                value={confirmPassword}
                type="password"
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          ) : (
            <div className="auth-remember-row">
              <label>
                <input
                  checked={rememberAccount}
                  type="checkbox"
                  onChange={(event) => {
                    setRememberAccount(event.target.checked);
                    if (!event.target.checked) {
                      setRememberPassword(false);
                    }
                  }}
                />
                <span>{labels.rememberAccount}</span>
              </label>
              <label>
                <input
                  checked={rememberPassword}
                  type="checkbox"
                  onChange={(event) => {
                    setRememberPassword(event.target.checked);
                    if (event.target.checked) {
                      setRememberAccount(true);
                    }
                  }}
                />
                <span>{labels.rememberPassword}</span>
              </label>
            </div>
          )}

          {mode !== "reset" ? (
            <button className="auth-link-button" type="button" onClick={() => switchMode("reset")}>
              {labels.forgotPassword}
            </button>
          ) : (
            <button className="auth-link-button" type="button" onClick={() => switchMode("login")}>
              {labels.backToLogin}
            </button>
          )}

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="primary-button auth-submit" type="submit">
            {isSubmitting
              ? labels.submitting
              : mode === "register"
                ? labels.create
                : mode === "reset"
                  ? labels.resetPassword
                  : labels.enter}
          </button>
        </form>
      </section>
    </main>
  );
}

function getAuthErrorMessage(
  mode: AuthMode,
  reason: "email-used" | "not-found" | "invalid" | undefined,
  labels: ReturnType<typeof buildAuthLabels>
) {
  if (mode === "register" && reason === "email-used") {
    return labels.emailUsed;
  }

  if (mode === "reset" && reason === "not-found") {
    return labels.accountNotFound;
  }

  if (mode === "reset") {
    return labels.resetFailed;
  }

  return mode === "register" ? labels.registerFailed : labels.loginFailed;
}

function readRememberedAuth(): RememberedAuth {
  if (typeof window === "undefined") {
    return createEmptyRememberedAuth();
  }

  try {
    const raw = window.localStorage.getItem(rememberStorageKey);
    if (!raw) {
      return createEmptyRememberedAuth();
    }

    return {
      ...createEmptyRememberedAuth(),
      ...(JSON.parse(raw) as Partial<RememberedAuth>),
    };
  } catch {
    return createEmptyRememberedAuth();
  }
}

function writeRememberedAuth(auth: RememberedAuth) {
  window.localStorage.setItem(rememberStorageKey, JSON.stringify(auth));
}

function createEmptyRememberedAuth(): RememberedAuth {
  return {
    email: "",
    password: "",
    rememberAccount: false,
    rememberPassword: false,
  };
}

function buildAuthLabels(language: "zh" | "en") {
  return language === "zh"
    ? {
        title: "登录 Wander",
        registerTitle: "创建 Wander 账号",
        resetTitle: "重置密码",
        login: "登录",
        register: "注册",
        resetPassword: "重置密码",
        email: "邮箱 / 账号",
        password: "密码",
        confirmPassword: "确认密码",
        rememberAccount: "记住账号",
        rememberPassword: "记住密码",
        forgotPassword: "忘记密码？",
        backToLogin: "返回登录",
        enter: "进入 Wander",
        create: "创建账号",
        emailRequired: "请先输入邮箱。",
        passwordRule: "密码必须大于 6 位。",
        passwordMismatch: "两次输入的密码不一致。",
        loginFailed: "账号或密码不正确，请检查后再试。",
        emailUsed: "该邮箱已被使用，请更换邮箱。",
        accountNotFound: "该邮箱还没有注册，请先注册账号。",
        resetFailed: "密码重置失败，请检查邮箱和新密码。",
        registerFailed: "注册失败，请稍后再试。",
        submitting: "处理中...",
      }
    : {
        title: "Sign in to Wander",
        registerTitle: "Create your Wander account",
        resetTitle: "Reset password",
        login: "Log In",
        register: "Register",
        resetPassword: "Reset Password",
        email: "Email / Account",
        password: "Password",
        confirmPassword: "Confirm Password",
        rememberAccount: "Remember account",
        rememberPassword: "Remember password",
        forgotPassword: "Forgot password?",
        backToLogin: "Back to login",
        enter: "Enter Wander",
        create: "Create Account",
        emailRequired: "Please enter your account first.",
        passwordRule: "Password must be longer than 6 characters.",
        passwordMismatch: "The two passwords do not match.",
        loginFailed: "The account or password is incorrect.",
        emailUsed: "This email is already in use. Please use another email.",
        accountNotFound: "This email is not registered yet. Please create an account first.",
        resetFailed: "Password reset failed. Please check the email and new password.",
        registerFailed: "Registration failed. Please try again later.",
        submitting: "Working...",
      };
}
