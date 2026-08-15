import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UpcomingGamesList } from "@/features/games/components/UpcomingGamesList";

export function HomePage() {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-muted/30">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <UpcomingGamesList />
      </main>

      <Footer />
    </div>
  );
}
