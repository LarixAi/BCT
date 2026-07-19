import { Home, DollarSign, Mail, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";

const tabs = [
  { id: "home",     label: "Home",     Icon: Home },
  { id: "earnings", label: "Earnings", Icon: DollarSign },
  { id: "inbox",    label: "Inbox",    Icon: Mail },
  { id: "menu",     label: "Menu",     Icon: Menu },
];

export default function DriverBottomNav({ active, onChange, unreadMessages = 0, inStack = false }) {
  return (
    <nav
      className={`w-full bg-white ${inStack ? "" : "border-t border-gray-100"}`}
      style={{ paddingBottom: DRIVER_SAFE_BOTTOM }}
      aria-label="Driver navigation"
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-2">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          const badge = id === "inbox" && unreadMessages > 0 ? unreadMessages : null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-1 min-w-[60px] relative py-0.5"
            >
              <div className="relative">
                <Icon className={`w-6 h-6 transition-colors ${isActive ? "text-black" : "text-gray-400"}`} aria-hidden="true" />
                {badge && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-blue-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium transition-colors ${isActive ? "text-black" : "text-gray-400"}`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
