import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  FileSearch,
  ListChecks,
  Download,
  FileCode,
  Edit3,
  Send,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", step: undefined },
  { to: "/upload", icon: Upload, label: "1. Upload Documents", step: 1 },
  { to: "/requirements", icon: FileSearch, label: "2. Requirements", step: 2 },
  { to: "/test-cases", icon: ListChecks, label: "3. Test Cases", step: 3 },
  { to: "/katalon-export", icon: FileCode, label: "4. Katalon Scripts", step: 4 },
  { to: "/testrail", icon: Send, label: "5. TestRail Push", step: 5 },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">ST</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight">SimplifyTesting</h1>
            <p className="text-xs text-muted-foreground">AI Test Engineering</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-primary glow-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Workflow summary */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="px-3 py-3 rounded-lg bg-surface text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground mb-2">Workflow</p>
          {[
            "Upload → Extract Requirements",
            "AI Test Case Generation",
            "Human Refinement → Download CSV",
            "AI Katalon Code Generation",
            "Human Refinement → Download ZIP",
          ].map((step, i) => (
            <p key={i} className="flex items-start gap-1.5">
              <span className="text-primary font-mono">{i + 1}.</span>
              <span>{step}</span>
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
