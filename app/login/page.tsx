import { loginAction } from "@/lib/actions";

export default function LoginPage({ searchParams }: { searchParams: { err?: string } }) {
  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>悦享月子中心</h1>
        <div className="muted mb12">产妇护理计划与家属探访平台</div>
        {searchParams.err && <div className="alert bad mb12">用户名或密码错误，请重试。</div>}
        <form action={loginAction}>
          <label className="f"><span>登录身份</span>
            <select name="kind" defaultValue="staff">
              <option value="staff">中心员工</option>
              <option value="family">家属</option>
            </select>
          </label>
          <label className="f"><span>用户名</span><input name="username" placeholder="如 nurse / family1" required /></label>
          <label className="f"><span>密码</span><input name="password" type="password" placeholder="演示密码见 README" required /></label>
          <button className="btn primary" style={{ width: "100%" }} type="submit">登录</button>
        </form>
        <div className="small muted mt12">
          员工测试账号：admin / director / headnurse / nurse / ped / diet / rehab / nanny / front / finance
          （密码分别见 README）；家属：family1 / family2，密码 fam123。
        </div>
      </div>
    </div>
  );
}
