import Nav from "@/components/Nav";
import { requireStaff } from "@/lib/auth";
import { getDischargeBoard } from "@/lib/queries";
import { doneFollowup, addReferral, updateReferralStatus } from "@/lib/actions";
import { FOLLOWUP_STATUS, REFERRAL_STATUS, REFERRAL_KIND } from "@/lib/labels";

export const dynamic = "force-dynamic";

const money = (n: number) => `¥${Number(n).toLocaleString()}`;

export default async function DischargePage() {
  const me = await requireStaff();
  const { discharged, followups, referrals } = await getDischargeBoard();
  const canReferral = ["front_desk", "director", "admin", "head_nurse"].includes(me.role);

  return (
    <>
      <Nav active="/discharge" />
      <main className="page">
        <h1>出所归档 · 母婴随访 · 复购转介绍</h1>
        <div className="sub mb12">出所后保留护理计划、异常记录、费用结算与回访建议；护理记录进入母婴随访；沉淀复购与转介绍线索。</div>

        <div className="grid cols-2">
          <div className="card" style={{ gridColumn: "1/-1" }}>
            <h3>出所档案</h3>
            <table className="tbl">
              <thead><tr><th>房间</th><th>产妇/宝宝</th><th>出所日</th><th>总额</th><th>已付</th><th>退费</th><th>回访建议</th></tr></thead>
              <tbody>
                {discharged.map((d: any) => (
                  <tr key={d.resident_id}>
                    <td>{d.room_no}</td><td>{d.mother} / {d.baby_name}</td>
                    <td className="mono small">{d.checkout_date}</td>
                    <td className="mono">{money(d.total_amount)}</td>
                    <td className="mono">{money(d.paid_amount)}</td>
                    <td className="mono" style={{ color: "#2e7d4f" }}>{money(d.refund_amount)}</td>
                    <td className="small">{d.followup_advice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>母婴随访计划（护理记录延续）</h3>
            <ul className="timeline">
              {followups.map((f: any) => (
                <li key={f.id}>
                  <div className="between">
                    <b>{f.mother} / {f.baby_name}</b>
                    <span className={f.status === "done" ? "badge ok" : "badge info"}>{FOLLOWUP_STATUS[f.status]}</span>
                  </div>
                  <div className="small muted">计划：{f.plan_date} · 负责人：{f.staff_name || "待分配"}</div>
                  {f.done_at && <div className="small">完成于 {f.done_at}<br />产妇：{f.mother_note}<br />宝宝：{f.baby_note}</div>}
                  {f.status !== "done" && (
                    <form action={doneFollowup} className="mt8">
                      <input type="hidden" name="followup_id" value={f.id} />
                      <label className="f"><span>产妇恢复</span><input name="mother_note" required placeholder="恶露/切口/情绪/哺乳" /></label>
                      <label className="f"><span>宝宝情况（黄疸/体重/喂养）</span><input name="baby_note" required /></label>
                      <button className="btn small primary">完成随访</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3>复购 / 转介绍线索</h3>
            <table className="tbl mb8">
              <thead><tr><th>类型</th><th>联系人</th><th>电话</th><th>备注</th><th>状态</th><th></th></tr></thead>
              <tbody>
                {referrals.map((r: any) => (
                  <tr key={r.id}>
                    <td><span className="badge brand">{REFERRAL_KIND[r.kind]}</span><div className="small muted">{r.mother}</div></td>
                    <td className="small">{r.contact_name}</td><td className="small mono">{r.contact_phone}</td>
                    <td className="small muted">{r.note}</td>
                    <td><span className={r.status === "won" ? "badge ok" : r.status === "lost" ? "badge bad" : "badge info"}>{REFERRAL_STATUS[r.status]}</span></td>
                    <td>
                      {canReferral && (
                        <form action={updateReferralStatus}>
                          <input type="hidden" name="referral_id" value={r.id} />
                          <select name="status" defaultValue={r.status} style={{ width: 90 }}>
                            {Object.entries(REFERRAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <button className="btn small mt8">更新</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {canReferral && (
              <details>
                <summary className="btn small">+ 登记新线索</summary>
                <form action={addReferral} className="mt8">
                  <div className="formrow">
                    <label className="f"><span>来源产妇</span>
                      <select name="resident_id"><option value="3">周敏（已出所）</option><option value="1">林晚（在住）</option><option value="2">苏晴（在住）</option></select>
                    </label>
                    <label className="f"><span>类型</span><select name="kind"><option value="referral">转介绍</option><option value="repurchase">复购</option></select></label>
                    <label className="f"><span>联系人</span><input name="contact_name" required /></label>
                    <label className="f"><span>电话</span><input name="contact_phone" /></label>
                  </div>
                  <label className="f"><span>备注</span><input name="note" placeholder="预产期/套餐意向/参观时间" /></label>
                  <button className="btn small primary">登记线索</button>
                </form>
              </details>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
