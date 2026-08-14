import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">This page could not be found.</p>
        <Link to="/" className={cn(buttonVariants(), "mt-4 inline-flex no-underline")}>
          Back home
        </Link>
      </div>
    </div>
  );
}
