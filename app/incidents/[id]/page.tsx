import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { requireStaff, ROLE_LABEL, type StaffRole } from "@/lib/auth";
import { getIncident } from "@/lib/queries";
import { addIncidentAction } from "@/lib/actions";
import { INCIDENT_TYPE, INCIDENT_STATUS, SEVERITY } from "@/lib/labels";

export const dynamic = "force-dynamic";

// 各异常类型由哪些角色按流程协同
const FLOW: Record<string, StaffRole[]> = {
  jaundice: ["nurse", "pediatrician", "head_nurse", "director"],
  breast_block: ["nurse", "head_nurse", "pediatrician"],
  temp_visit: ["front_desk", "head_nurse", "nurse"],
  nanny_leave: ["nanny", "director", "head_nurse"],
  meal_violation: ["dietitian", "head_nurse", "front_desk", "director"],
  rehab_delay: ["rehab", "front_desk", "head_nurse"],
  package_upgrade: ["finance", "front_desk", "director"],
  room_upgrade: ["finance", "front_desk", "director"],
  early_checkout: ["finance", "head_nurse", "director"],
  record_dispute: ["head_nurse", "director", "nanny", "nurse"],
  checkout_dispute: ["head_nurse", "finance", "director"],
  other: ["head_nurse", "director"],
};

const ACTION_LABEL: Record<string, string> = {
  create: "发起", assign: "分派", handle: "接手处理", approve: "审批",
  escalate: "升级", resolve: "解决归档", comment: "备注", close: "关闭",
};

export default async function IncidentDetail({ params }: { params: { id: string } }) {
  const me = await requireStaff();
  const data = await getIncident(Number(params.id));
  if (!data) notFound();
  const { incident: i, actions } = data;
  const flowRoles = FLOW[i.type] || FLOW.other;
  const inFlow = flowRoles.includes(me.role) || me.role === "admin";
  const closed = ["resolved", "closed"].includes(i.status);

  return (
    <>
      <Nav active="/incidents" />
      <main className="page">
        <div className="between mb8">
          <Link href="/incidents" className="btn small">← 异常列表</Link>
          <Link href={`/rooms/${i.room_id}`} className="btn small">进入房间 {i.room_no} →</Link>
        </div>
        <div className="grid cols-2">
          <div className="card">
            <h3>
              <span className="badge brand">{INCIDENT_TYPE[i.type]}</span>
              {i.title}
            </h3>
            <div className="flex wrap mb8">
              <span className={i.severity === "high" ? "badge bad" : i.severity === "medium" ? "badge warn" : "badge"}>等级：{SEVERITY[i.severity]}</span>
              <span className={i.status === "escalated" ? "badge bad" : "badge info"}>状态：{INCIDENT_STATUS[i.status]}</span>
              <span className="badge">牵头：{i.lead_role}</span>
              {i.dispute_to_headnurse ? <span className="badge bad">退所争议已同步护士长</span> : null}
              <span className="badge">{i.raised_by_type === "family" ? "家属发起" : "员工发起"}</span>
            </div>
            <p>{i.description}</p>
            <div className="small muted">房间 {i.room_no} · {i.mother} / {i.baby_name} · {i.created_at}</div>
            {i.resolution && <div className="alert info mt12"><b>处置结论：</b>{i.resolution}</div>}

            <h3 className="mt16">协同链路（{flowRoles.map((r) => ROLE_LABEL[r]).join(" → ")}）</h3>
            <ul className="timeline">
              {actions.map((a: any) => (
                <li key={a.id}>
                  <span className="badge brand">{ACTION_LABEL[a.action] || a.action}</span> <b>{a.actor_name}</b>
                  <span className="small muted">（{ROLE_LABEL[a.actor_role as StaffRole] || a.actor_role}）</span>
                  <div>{a.content}</div>
                  <div className="t">{a.created_at}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>我的处置</h3>
            {!inFlow && <div className="alert warn mb8">您的角色不在该异常的协同链路中，仅可查看；可添加备注协助。</div>}
            {closed && <div className="alert ok mb8" style={{ background: "var(--ok-soft)", borderColor: "#bfe0cc", color: "var(--ok)" }}>该异常已{INCIDENT_STATUS[i.status]}，如需重新打开请在备注中说明并联系护士长。</div>}
            <form action={addIncidentAction}>
              <input type="hidden" name="incident_id" value={i.id} />
              <div className="formrow">
                <label className="f"><span>动作</span>
                  <select name="action" defaultValue="comment">
                    {inFlow && !closed && <option value="handle">接手处理（状态→处理中）</option>}
                    {inFlow && !closed && <option value="assign">分派</option>}
                    {(me.role === "head_nurse" || me.role === "director" || me.role === "admin") && !closed && <option value="escalate">升级（如退所争议）</option>}
                    {inFlow && !closed && <option value="resolve">解决并归档</option>}
                    {(me.role === "head_nurse" || me.role === "director" || me.role === "admin") && <option value="close">关闭</option>}
                    <option value="comment">仅备注</option>
                  </select>
                </label>
              </div>
              <label className="f"><span>处置内容（将通知本房间相关角色与家属）</span>
                <textarea name="content" required placeholder="如：已停餐重做，厨房增设过敏红色餐标，逐餐复核……" />
              </label>
              <button className="btn primary small">提交协同动作</button>
            </form>

            <div className="mt12 small muted">
              角色提示：护理师发现上报 → 护士长协调 → 儿科医生（黄疸）/营养师（忌口）/产康师（延期）/前台（探访、通知）/月嫂（请假顶班）→ 财务（费用、退所）→ 护理主管与管理者复盘客诉。
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
