import { redirect } from "next/navigation";
import { getPrincipal } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/auth";

export default async function Home() {
  const p = await getPrincipal();
  if (!p) redirect("/login");
  if (p.kind === "family") redirect("/family");
  redirect(ROLE_HOME[p.role] || "/rooms");
}
