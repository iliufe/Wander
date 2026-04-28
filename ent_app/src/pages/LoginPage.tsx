import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";
import { useWander } from "../wander-state";

type AuthMode = "login" | "register";

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
  const { login, register } = useWander();
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

    if (mode === "register" && safePassword !== confirmPassword.trim()) {
      setError(labels.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    const success =
      mode === "register"
        ? await register({
        email: safeEmail,
        name: "Wander User",
        password: safePassword,
          })
        : await login({
        email: safeEmail,
        password: safePassword,
          });

    setIsSubmitting(false);
    if (!success) {
      setError(mode === "register" ? labels.registerFailed : labels.loginFailed);
      return;
    }

    writeRememberedAuth({
      email: rememberAccount || rememberPassword ? safeEmail : "",
      password: rememberPassword ? safePassword : "",
      rememberAccount,
      rememberPassword,
    });
    setError("");
    navigate(mode === "register" ? "/onboarding" : "/", {
      replace: true,
    });
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
          <h1>{mode === "register" ? labels.registerTitle : labels.title}</h1>
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
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {mode === "register" ? (
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

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="primary-button auth-submit" type="submit">
            {isSubmitting ? labels.submitting : mode === "register" ? labels.create : labels.enter}
          </button>
        </form>
      </section>
    </main>
  );
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
        login: "登录",
        register: "注册",
        email: "邮箱 / 账号",
        password: "密码",
        confirmPassword: "确认密码",
        rememberAccount: "记住账号",
        rememberPassword: "记住密码",
        enter: "进入 Wander",
        create: "创建账号",
        emailRequired: "请先输入账号。",
        passwordRule: "密码必须大于 6 位。",
        passwordMismatch: "两次输入的密码不一致。",
        loginFailed: "账号或密码不正确，请检查后再试。",
        registerFailed: "注册失败，请检查账号是否已经存在。",
        submitting: "处理中...",
      }
    : {
        title: "Sign in to Wander",
        registerTitle: "Create your Wander account",
        login: "Log In",
        register: "Register",
        email: "Email / Account",
        password: "Password",
        confirmPassword: "Confirm Password",
        rememberAccount: "Remember account",
        rememberPassword: "Remember password",
        enter: "Enter Wander",
        create: "Create Account",
        emailRequired: "Please enter your account first.",
        passwordRule: "Password must be longer than 6 characters.",
        passwordMismatch: "The two passwords do not match.",
        loginFailed: "The account or password is incorrect.",
        registerFailed: "Registration failed. Please check whether the account already exists.",
        submitting: "Working...",
      };
}
