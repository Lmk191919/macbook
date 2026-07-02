import Link from "next/link";

type LoginPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function hasLoginError(searchParams?: Record<string, string | string[] | undefined>): boolean {
  const error = searchParams?.error;
  return error === "1" || error === "true";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showError = hasLoginError(resolvedSearchParams);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-kicker">团队密码登录</p>
        <h1>知底装修报价</h1>
        <p className="auth-copy">输入统一团队密码后进入报价、项目库和打印页。</p>

        <form action="/api/auth/login" method="post" className="auth-form">
          <label className="auth-label" htmlFor="password">
            团队密码
          </label>
          <input
            className="auth-input focus-ring"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={1}
            maxLength={128}
            required
          />
          {showError ? <p className="auth-error">密码不正确，请重试。</p> : null}
          <button className="auth-button focus-ring" type="submit">
            进入系统
          </button>
        </form>

        <p className="auth-footer">
          <Link className="focus-ring" href="/">
            返回首页
          </Link>
        </p>
      </section>
    </main>
  );
}
