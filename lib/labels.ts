export const DELIVERY: Record<string, string> = { vaginal: "顺产", cesarean: "剖宫产", assisted: "助产" };
export const FEEDING: Record<string, string> = { breast: "纯母乳", bottle: "奶瓶", mixed: "混合喂养" };
export const JAUNDICE: Record<string, string> = { none: "无黄疸", mild: "轻度", moderate: "中度", high: "偏高⚠" };
export const PLAN_CAT: Record<string, string> = {
  rounds: "查房", wound: "伤口观察", breast: "乳房护理", rehab: "产康课程",
  meal: "月子餐", bath: "宝宝洗澡抚触", nightcare: "夜间照护",
};
export const PLAN_STATUS: Record<string, string> = { planned: "待执行", done: "已完成", delayed: "已延期", cancelled: "已取消" };
export const INCIDENT_TYPE: Record<string, string> = {
  jaundice: "黄疸升高", breast_block: "乳腺堵塞", temp_visit: "临时探访", nanny_leave: "月嫂请假",
  meal_violation: "餐食忌口", rehab_delay: "产康延期", package_upgrade: "套餐升级", room_upgrade: "房间升级",
  early_checkout: "提前退所", record_dispute: "质疑护理记录", checkout_dispute: "退所争议", other: "其他",
};
export const INCIDENT_STATUS: Record<string, string> = {
  open: "待处理", processing: "处理中", resolved: "已解决", closed: "已关闭", escalated: "已升级",
};
export const SEVERITY: Record<string, string> = { low: "低", medium: "中", high: "高" };
export const VISIT_STATUS: Record<string, string> = {
  requested: "待审批", approved: "已批准", rejected: "已拒绝", checked_in: "探访中", finished: "已结束",
};
export const FEE_TYPE: Record<string, string> = {
  package: "套餐房费", upgrade: "升级差价", rehab: "产康", meal: "月子餐", gift: "套餐赠品",
  medical: "医疗", refund: "退费", other: "其他",
};
export const FEE_STATUS: Record<string, string> = { unpaid: "待收", paid: "已收", refunded: "已退" };
export const MEAL_SLOT: Record<string, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };
export const SHIFT: Record<string, string> = { day: "白班", night: "夜班", off: "休息", leave: "请假" };
export const REHAB_STATUS: Record<string, string> = { scheduled: "已排期", done: "已完成", delayed: "已延期", cancelled: "已取消" };
export const FOLLOWUP_STATUS: Record<string, string> = { planned: "待随访", done: "已完成", missed: "未联系上" };
export const REFERRAL_STATUS: Record<string, string> = { lead: "线索", contacted: "已联系", won: "成交", lost: "流失" };
export const REFERRAL_KIND: Record<string, string> = { repurchase: "复购", referral: "转介绍" };

export function badgeClassForStatus(st: string): string {
  if (["done", "resolved", "paid", "served", "approved", "finished", "pass", "won", "checked_in"].includes(st)) return "ok";
  if (["open", "requested", "planned", "unpaid", "scheduled", "lead", "processing"].includes(st)) return "info";
  if (["delayed", "processing2", "contacted", "escalated"].includes(st)) return "warn";
  if (["high", "issue", "rejected", "cancelled", "lost", "leave", "refunded"].includes(st)) return "bad";
  return "";
}
