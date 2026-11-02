import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/common/ui";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="This page doesn't exist in Jeympt."
      action={<Link to="/" className={buttonVariants({ variant: "outline" })} data-testid="not-found-home-link">Go to dashboard</Link>}
      testId="not-found-page"
    />
  );
}
