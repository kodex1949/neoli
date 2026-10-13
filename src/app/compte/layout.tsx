import { AccountNav } from "@/components/account/AccountNav";
import { requireUser } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser();
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return (
    <div className="acct">
      <AccountNav name={name || "Mon compte"} email={user.email ?? ""} />
      <div className="acct__main">{children}</div>
    </div>
  );
}
