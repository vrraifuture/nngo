import Navbar from "@/components/navbar";
import { createClient } from "../../supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Simple Hero Section */}
      <section className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-4xl mx-auto px-4">
          <h1 className="text-8xl sm:text-9xl font-bold text-blue-600 tracking-tight mb-8">
            Pryro for NGO
          </h1>
          <div className="text-xl sm:text-2xl text-gray-700 leading-relaxed">
            <p className="font-semibold text-blue-600 mb-2">
              Transparency. Trust. Impact
            </p>
            <p>
              Empowering NGOs to manage donations, track budgets, and report
              with confidence.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
