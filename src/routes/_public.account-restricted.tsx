import { createFileRoute, Link } from "@tanstack/react-router";
import { YardMobileAuthLayout } from "@/components/auth/YardMobileAuthLayout";

export const Route = createFileRoute("/_public/account-restricted")({
  component: AccountRestrictedPage,
});

function AccountRestrictedPage() {
  return (
    <YardMobileAuthLayout
      title="Access restricted"
      subtitle="This account has been suspended. Contact your company administrator."
      showBrand={false}
      animate
    >
      <Link to="/sign-in" className="yard-auth-link text-sm">
        Back to sign in
      </Link>
    </YardMobileAuthLayout>
  );
}
