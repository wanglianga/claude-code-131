import Link from "next/link";
import Nav from "@/components/Nav";
import { requireStaff } from "@/lib/auth";
import { listIncidents } from "@/lib/queries";
import { INCIDENT_TYPE, INCIDENT_STATUS, SEVERITY } from "@/lib/labels";

export const dynamic = "force-dynamic";

const FILTERS = [
  ["all", "全部"], ["open", "待处理"], ["processing", "处理中"],
  ["escalated", "已升级"], ["resolved", "已解决"], ["closed", "已关闭"],
] as const;

export default async function IncidentsPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireStaff();
  const status = searchParams.status || "all";
  const list = await listIncidents({ status });

  return (
    <>
      <Nav active="/incidents" />
      <main className="page">
        <h1>异常协同中心</h1>
        <div className="sub mb12">黄疸升高 / 乳腺堵塞 / 临时探访 / 月嫂请假 / 餐食忌口 / 产康延期 / 套餐与房间升级 / 提前退所 / 质疑护理记录 / 退所争议 —— 护理师、护士长、儿科医生、营养师、前台、家属、财务围绕同一房间协同处置。</div>
        <div className="tabs">
          {FILTERS.map(([k, label]) => (
            <Link key={k} href={k === "all" ? "/incidents" : `/incidents?status=${k}`} className={status === k ? "active" : ""}>{label}</Link>
          ))}
        </div>
        <div className="card">
          <table className="tbl">
            <thead><tr><th>房间</th><th>类型</th><th>标题</th><th>等级</th><th>状态</th><th>牵头</th><th>协同</th><th>发起时间</th><th></th></tr></thead>
            <tbody>
              {list.map((i: any) => (
                <tr key={i.id}>
                  <td><b>{i.room_no}</b><div className="small muted">{i.mother} · {i.baby_name}</div></td>
                  <td><span className="badge brand">{INCIDENT_TYPE[i.type]}</span>{i.dispute_to_headnurse ? <div className="small" style={{ color: "#b03a3a" }}>已同步护士长</div> : null}</td>
                  <td className="small">{i.title}</td>
                  <td><span className={i.severity === "high" ? "badge bad" : i.severity === "medium" ? "badge warn" : "badge"}>{SEVERITY[i.severity]}</span></td>
                  <td><span className={i.status === "escalated" ? "badge bad" : i.status === "resolved" || i.status === "closed" ? "badge ok" : "badge info"}>{INCIDENT_STATUS[i.status]}</span></td>
                  <td className="small">{i.lead_role}</td>
                  <td className="small">{i.action_cnt} 条</td>
                  <td className="mono small">{i.created_at}</td>
                  <td><Link className="btn small" href={`/incidents/${i.id}`}>处置</Link></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={9} className="muted">该状态下暂无异常。</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
