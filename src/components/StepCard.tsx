import { motion } from "framer-motion";
import { LucideIcon, Check } from "lucide-react";

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
  status: "pending" | "active" | "completed";
  onClick?: () => void;
}

const StepCard = ({ step, title, description, icon: Icon, status, onClick }: StepCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.1 }}
      onClick={onClick}
      className={`relative p-5 rounded-xl border cursor-pointer transition-all duration-300 ${
        status === "active"
          ? "border-primary/50 bg-card glow-primary"
          : status === "completed"
          ? "border-success/30 bg-card"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            status === "completed"
              ? "bg-success/20 text-success"
              : status === "active"
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {status === "completed" ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Step {step}</p>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default StepCard;
