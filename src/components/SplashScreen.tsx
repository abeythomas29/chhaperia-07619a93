import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

const SplashScreen = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white transition-opacity duration-1000">
      <div
        className={`flex flex-col items-center transform transition-all duration-1000 ${mounted ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
          }`}
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-orange-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="bg-zinc-900/80 p-8 rounded-3xl shadow-2xl border border-zinc-800 relative z-10 backdrop-blur-sm">
            <img
              src={logo}
              alt="Chhaperia Logo"
              className="w-48 md:w-64 h-auto object-contain bg-white px-6 py-4 rounded-xl"
            />
          </div>
        </div>

        <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase mb-12">
          Production Management
        </p>

        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-xs text-orange-400/80 font-medium animate-pulse tracking-widest uppercase">
            Loading System
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
