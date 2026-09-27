import Nav from "@/components/Nav";
import { requireStaff } from "@/lib/auth";
import { getFinanceOverview } from "@/lib/queries";
import { addFee, settleFee } from "@/lib/actions";
import { FEE_TYPE, FEE_STATUS } from "@/lib/labels";

export const dynamic = "force-dynamic";

const money = (n: number) => `¥${Number(n).toLocaleString()}`;

export default async function FinancePage() {
  const me = await requireStaff();
  const { unpaid, recent, discharges, sum } = await getFinanceOverview();
  const canWrite = ["finance", "admin", "front_desk"].includes(me.role);
  const canSettle = ["finance", "admin"].includes(me.role);

  return (
    <>
      <Nav active="/finance" />
      <main className="page">
        <h1>费用结算</h1>
        <div className="grid cols-4 mb12">
          <div className="card stat"><span className="num" style={{ color: "#b07a1e" }}>{money(sum.unpaid)}</span><span className="lbl">待收</span></div>
          <div className="card stat"><span className="num">{money(sum.paid)}</span><span className="lbl">已收</span></div>
          <div className="card stat"><span className="num" style={{ color: "#2e7d4f" }}>{money(sum.refunded)}</span><span className="lbl">已退</span></div>
          <div className="card stat"><span className="num">{unpaid.length}</span><span className="lbl">待收账单笔数</span></div>
        </div>

        <div className="grid cols-2">
          <div className="card">
            <h3>待收账单</h3>
            <table className="tbl">
              <thead><tr><th>房间</th><th>产妇</th><th>项目</th><th>金额</th><th>日期</th><th></th></tr></thead>
              <tbody>
                {unpaid.map((f: any) => (
                  <tr key={f.id}>
                    <td>{f.room_no}</td><td className="small">{f.mother}</td>
                    <td className="small">{f.item_name} <span className="badge">{FEE_TYPE[f.fee_type]}</span></td>
                    <td className="mono">{money(f.amount)}</td><td className="mono small">{f.occur_date}</td>
                    <td>{canSettle && (
                      <form action={settleFee}>
                        <input type="hidden" name="fee_id" value={f.id} />
                        <button className="btn small">确认收款</button>
                      </form>
                    )}</td>
                  </tr>
                ))}
                {unpaid.length === 0 && <tr><td colSpan={6} className="muted">全部收讫。</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>出所结算单</h3>
            <table className="tbl">
              <thead><tr><th>产妇</th><th>出所日</th><th>总额</th><th>已付</th><th>退费</th></tr></thead>
              <tbody>
                {discharges.map((d: any) => (
                  <tr key={d.id}>
                    <td>{d.mother}（{d.room_no}）</td><td className="mono small">{d.checkout_date}</td>
                    <td className="mono">{money(d.total_amount)}</td>
                    <td className="mono">{money(d.paid_amount)}</td>
                    <td className="mono" style={{ color: "#2e7d4f" }}>{money(d.refund_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="small muted mt8">提前退所 / 退所争议会生成异常单并同步护士长，费用调整可在此或房间台账中开单/退费。</div>
          </div>

          {canWrite && (
            <div className="card">
              <h3>开单 / 退费（跨房间）</h3>
              <form action={addFee}>
                <div className="formrow">
                  <label className="f"><span>产妇房间</span>
                    <select name="resident_id">
                      <option value="1">A301 · 林晚</option><option value="2">A302 · 苏晴</option>
                    </select>
                  </label>
                  <label className="f"><span>项目</span><input name="item_name" required placeholder="产康加课 / 房差 / 退费" /></label>
                  <label className="f"><span>类型</span>
                    <select name="fee_type">{Object.entries(FEE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  </label>
                  <label className="f"><span>金额（退款负数）</span><input name="amount" type="number" step="0.01" required /></label>
                  <label className="f"><span>日期</span><input name="occur_date" type="date" /></label>
                </div>
                <button className="btn primary small">提交（同步家属端费用明细）</button>
              </form>
            </div>
          )}

          <div className="card" style={{ gridColumn: "1/-1" }}>
            <h3>最近费用流水</h3>
            <table className="tbl">
              <thead><tr><th>时间</th><th>房间</th><th>产妇</th><th>项目</th><th>类型</th><th>金额</th><th>状态</th><th>日期</th></tr></thead>
              <tbody>
                {recent.map((f: any) => (
                  <tr key={f.id}>
                    <td className="mono small">{f.created_at}</td><td>{f.room_no}</td><td className="small">{f.mother}</td>
                    <td className="small">{f.item_name}</td><td><span className="badge">{FEE_TYPE[f.fee_type]}</span></td>
                    <td className="mono" style={{ color: f.amount < 0 ? "#2e7d4f" : undefined }}>{money(f.amount)}</td>
                    <td><span className={f.status === "unpaid" ? "badge warn" : "badge ok"}>{FEE_STATUS[f.status]}</span></td>
                    <td className="mono small">{f.occur_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
