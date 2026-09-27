import Link from "next/link";
import { getPrincipal, ROLE_LABEL } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

const STAFF_NAV = [
  { href: "/rooms", label: "房间总览" },
  { href: "/tasks", label: "我的任务" },
  { href: "/incidents", label: "异常协同" },
  { href: "/schedule", label: "排班与口碑" },
  { href: "/finance", label: "费用结算" },
  { href: "/discharge", label: "出所与随访" },
];

export default async function Nav({ active }: { active: string }) {
  const me = await getPrincipal();
  if (!me) return null;
  const navs = me.kind === "family" ? [{ href: "/family", label: "家属中心" }] : STAFF_NAV;
  return (
    <header className="topbar">
      <span className="logo">悦享月子中心</span>
      <nav>
        {navs.map((n) => (
          <Link key={n.href} href={n.href} className={active === n.href ? "active" : ""}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="me">
        <span>
          <b>{me.name}</b> · {me.kind === "staff" ? ROLE_LABEL[me.role] : `家属（${me.relation}）`}
        </span>
        <form action={logoutAction}>
          <button className="btn small ghost" type="submit">退出</button>
        </form>
      </div>
    </header>
  );
}
