"use client";

import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useUIStore } from "@/lib/store";

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <motion.button
      onClick={toggleTheme}
      /* ▼▼▼ FIXED: Removed 'border border-border/50 hover:border-border' ▼▼▼ */
      className="relative p-2.5 rounded-xl bg-background-elevated/50 hover:bg-background-elevated transition-all duration-300 group"
      /* ▲▲▲ ----------------------------------------------------------- ▲▲▲ */
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <div className="relative w-5 h-5">
        <motion.div
          initial={false}
          animate={{
            scale: theme === "dark" ? 1 : 0,
            rotate: theme === "dark" ? 0 : -90,
            opacity: theme === "dark" ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon className="w-5 h-5 text-primary" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            scale: theme === "light" ? 1 : 0,
            rotate: theme === "light" ? 0 : 90,
            opacity: theme === "light" ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun className="w-5 h-5 text-amber-500" />
        </motion.div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div
          className={`absolute inset-0 rounded-xl ${
            theme === "dark"
              ? "bg-primary/10 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
              : "bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          }`}
        />
      </div>
    </motion.button>
  );
}
