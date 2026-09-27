import Nav from "@/components/Nav";
import { requireFamily } from "@/lib/auth";
import { getFamilyPortal } from "@/lib/queries";
import { requestVisit, sendMessage, submitFeedback, createIncident } from "@/lib/actions";
import { DELIVERY, FEEDING, JAUNDICE, PLAN_CAT, VISIT_STATUS, FEE_TYPE, FEE_STATUS } from "@/lib/labels";

export const dynamic = "force-dynamic";

const money = (n: number) => `¥${Number(n).toLocaleString()}`;

export default async function FamilyPage({ searchParams }: { searchParams: { err?: string } }) {
  const me = await requireFamily();
  const d = await getFamilyPortal(me.id);

  if (!d.resident) {
    return (
      <>
        <Nav active="/family" />
        <main className="page">
          <div className="card"><h3>家属中心</h3><div className="muted">暂未查询到您授权关联的在住房间，请联系前台。</div></div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav active="/family" />
      <main className="page">
        <h1>家属中心 · {me.name}（{me.relation}）</h1>
        <div className="sub mb12">房间 {d.resident.room_no} · {d.resident.package_name} · 授权级别：{d.full ? "完整护理信息" : "护理摘要"}</div>
        {searchParams.err && <div className="alert bad mb12">操作失败，请稍后重试或联系前台。</div>}

        <div className="grid cols-2">
          <div className="card">
            <h3>妈妈与宝宝</h3>
            <dl className="kv">
              <dt>妈妈</dt><dd>{d.resident.name} · {DELIVERY[d.resident.delivery_type]}</dd>
              <dt>宝宝</dt><dd>{d.resident.baby_name}</dd>
              <dt>哺乳</dt><dd>{FEEDING[d.resident.feeding]}</dd>
              <dt>入住</dt><dd>{d.resident.checkin_date} ~ 预计 {d.resident.expected_checkout}</dd>
            </dl>
            <h3 className="mt12">宝宝体重 / 黄疸</h3>
            <table className="tbl">
              <tbody>
                {d.observations.map((o: any) => (
                  <tr key={o.observed_at}>
                    <td className="mono small">{o.observed_at}</td>
                    <td>{o.weight_g ? `${o.weight_g}g` : "—"}</td>
                    <td><span className={o.jaundice === "high" ? "badge bad" : "badge ok"}>{JAUNDICE[o.jaundice]}</span></td>
                    <td className="small muted">{o.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>护理摘要{!d.full && "（授权为摘要，仅显示最近记录）"}</h3>
            <ul className="timeline">
              {d.records.map((r: any) => (
                <li key={r.recorded_at + r.content}>
                  <b>{PLAN_CAT[r.category] || r.category}</b>
                  <div>{r.content}</div>
                  <div className="t">{r.recorded_at} · {r.recorder}</div>
                </li>
              ))}
            </ul>
            <details className="mt12">
              <summary className="btn small danger">质疑护理记录 / 发起客诉</summary>
              <form action={createIncident} className="mt8">
                <input type="hidden" name="resident_id" value={d.resident.id} />
                <input type="hidden" name="room_id" value={d.fam.room_id} />
                <input type="hidden" name="type" value="record_dispute" />
                <input type="hidden" name="severity" value="high" />
                <label className="f"><span>标题</span><input name="title" required defaultValue="家属质疑护理记录" /></label>
                <label className="f"><span>具体疑问（将直达护士长，必要时升级护理主管）</span><textarea name="description" required /></label>
                <button className="btn danger small">提交质疑</button>
              </form>
            </details>
          </div>

          <div className="card">
            <h3>探访预约</h3>
            <table className="tbl mb8">
              <thead><tr><th>访客</th><th>类型</th><th>时间</th><th>人数</th><th>状态</th></tr></thead>
              <tbody>
                {d.visits.map((v: any) => (
                  <tr key={v.id}>
                    <td className="small">{v.visitor_name}</td>
                    <td>{v.kind === "temporary" ? <span className="badge warn">临时增加</span> : <span className="badge">常规</span>}</td>
                    <td className="mono small">{v.visit_date} {v.visit_time}</td>
                    <td>{v.visitors_cnt}</td>
                    <td><span className={v.status === "rejected" ? "badge bad" : v.status === "finished" ? "badge ok" : "badge info"}>{VISIT_STATUS[v.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary className="btn small primary">+ 预约 / 临时增加探访</summary>
              <form action={requestVisit} className="mt8">
                <div className="formrow">
                  <label className="f"><span>访客姓名</span><input name="visitor_name" required defaultValue={me.name} /></label>
                  <label className="f"><span>联系电话</span><input name="visitor_phone" /></label>
                  <label className="f"><span>日期</span><input name="visit_date" type="date" required /></label>
                  <label className="f"><span>时间</span><input name="visit_time" placeholder="15:00" required /></label>
                  <label className="f"><span>人数</span><input name="visitors_cnt" type="number" min={1} defaultValue={1} /></label>
                  <label className="f"><span>类型</span>
                    <select name="kind" defaultValue="scheduled">
                      <option value="scheduled">常规预约</option>
                      <option value="temporary">临时增加（需护士长审批）</option>
                    </select>
                  </label>
                </div>
                <label className="f"><span>临时探访事由（临时增加时填写）</span><input name="temp_reason" placeholder="如：老人外地赶来" /></label>
                <button className="btn primary small">提交预约</button>
              </form>
            </details>
          </div>

          <div className="card">
            <h3>费用明细 <span className="cnt">合计 {money(d.feeSum.total)} · 待收 {money(d.feeSum.unpaid)}</span></h3>
            <table className="tbl">
              <thead><tr><th>日期</th><th>项目</th><th>类型</th><th>金额</th><th>状态</th></tr></thead>
              <tbody>
                {d.fees.map((f: any) => (
                  <tr key={f.occur_date + f.item_name}>
                    <td className="mono small">{f.occur_date}</td>
                    <td className="small">{f.item_name}</td>
                    <td className="small muted">{FEE_TYPE[f.fee_type]}</td>
                    <td className="mono" style={{ color: f.amount < 0 ? "#2e7d4f" : undefined }}>{money(f.amount)}</td>
                    <td><span className={f.status === "unpaid" ? "badge warn" : "badge ok"}>{FEE_STATUS[f.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>近期护理安排</h3>
            <ul>
              {d.plans.map((p: any) => (
                <li key={p.title + p.plan_time} className="small">
                  <span className="badge brand">{PLAN_CAT[p.category]}</span> {p.title} · <span className="mono">{p.plan_time}</span>
                  {p.status === "delayed" && <span className="badge warn"> 已延期</span>}
                </li>
              ))}
            </ul>

            <h3 className="mt12">与中心沟通</h3>
            <ul className="timeline">
              {d.messages.map((m: any) => (
                <li key={m.id}>
                  <b>{m.sender_name}</b> <span className={m.sender_type === "family" ? "badge brand" : "badge info"}>{m.sender_type === "family" ? "家属" : "中心"}</span>
                  <div>{m.content}</div><div className="t">{m.created_at}</div>
                </li>
              ))}
            </ul>
            <form action={sendMessage}>
              <label className="f"><span>发送消息给护理团队</span><input name="content" required /></label>
              <button className="btn primary small">发送</button>
            </form>
          </div>

          <div className="card">
            <h3>满意度反馈（影响护理师排班与中心口碑）</h3>
            <form action={submitFeedback}>
              <div className="formrow">
                <label className="f"><span>评分</span>
                  <select name="score" defaultValue="5"><option value="5">★★★★★ 非常满意</option><option value="4">★★★★ 满意</option><option value="3">★★★ 一般</option><option value="2">★★ 不满意</option><option value="1">★ 很不满意</option></select>
                </label>
                <label className="f"><span>具体护理人员（可空）</span>
                  <select name="target_staff_id">
                    <option value="">不指定（中心整体）</option>
                    <option value="4">林晓（护理师）</option>
                    <option value="5">赵敏（护理师）</option>
                    <option value="9">钱阿姨（月嫂）</option>
                    <option value="8">孙悦（产康师）</option>
                    <option value="7">吴燕（营养师）</option>
                  </select>
                </label>
                <label className="f"><span>标签</span><input name="tags" placeholder="表扬 / 投诉 / 沟通 / 专业" /></label>
              </div>
              <label className="f"><span>反馈内容</span><textarea name="content" required /></label>
              <button className="btn primary small">提交反馈</button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
