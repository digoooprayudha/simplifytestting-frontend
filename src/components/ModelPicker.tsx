import { Brain } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWizard } from "@/lib/wizardContext";

interface ModelPickerProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ModelPicker = ({ value, onChange, disabled, compact }: ModelPickerProps) => {
  const { availableModels, getModelLabel, isKnownModel } = useWizard();

  const displayLabel = getModelLabel(value);

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : ""}`}>
      <Brain className="w-3.5 h-3.5 text-primary shrink-0" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-7 text-xs w-auto min-w-[140px] border-dashed">
          <SelectValue>{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              <span className="text-xs">{m.label}</span>
            </SelectItem>
          ))}
          {!isKnownModel(value) && value && (
            <SelectItem value={value}>
              <span className="text-xs">{value}</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelPicker;
