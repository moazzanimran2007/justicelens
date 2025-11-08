import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { AlertCircle, BarChart3, FileText, Brain } from "lucide-react";

interface ModuleSelectorProps {
  selectedModules: string[];
  onModuleToggle: (module: string) => void;
}

const modules = [
  {
    id: "innocence",
    name: "Innocence Claims Detector",
    description: "Flags explicit and implicit claims of innocence in the transcript",
    icon: AlertCircle,
    color: "primary"
  },
  {
    id: "bias",
    name: "Bias & Fairness Audit",
    description: "Detects stigmatizing language and potential bias patterns",
    icon: BarChart3,
    color: "accent"
  },
  {
    id: "summary",
    name: "Advocate Fact Sheet",
    description: "Generates a concise summary with key facts and evidence",
    icon: FileText,
    color: "success"
  },
  {
    id: "language",
    name: "Language Pattern Analysis",
    description: "Analyzes usage of terms like 'insight', 'remorse', and 'accountability'",
    icon: Brain,
    color: "warning"
  }
];

const ModuleSelector = ({ selectedModules, onModuleToggle }: ModuleSelectorProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Select Analysis Modules
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which types of analysis to run on your transcript
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const isSelected = selectedModules.includes(module.id);
          
          return (
            <Card
              key={module.id}
              className={`p-4 cursor-pointer transition-all ${
                isSelected ? "border-primary bg-primary/5" : "border-border"
              }`}
              onClick={() => onModuleToggle(module.id)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onModuleToggle(module.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg bg-${module.color}/10`}>
                      <Icon className={`w-4 h-4 text-${module.color}`} />
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">
                      {module.name}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {module.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleSelector;
