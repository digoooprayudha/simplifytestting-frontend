import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const TestRailPush = () => {
  const [config, setConfig] = useState({
    url: "",
    username: "",
    apiKey: "",
    projectId: "",
    suiteId: "",
  });
  const [isPushing, setIsPushing] = useState(false);
  const [pushed, setPushed] = useState(false);

  const handlePush = () => {
    if (!config.url || !config.username || !config.apiKey) {
      toast.error("Please fill in all required TestRail credentials");
      return;
    }
    setIsPushing(true);
    setTimeout(() => {
      setIsPushing(false);
      setPushed(true);
      toast.success("Test cases pushed to TestRail successfully!");
    }, 2000);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Push to TestRail</h1>
        <p className="text-muted-foreground mt-2">
          Sync refined and approved test cases to your TestRail project
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 p-6 rounded-xl bg-card border border-border"
      >
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">TestRail Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">TestRail URL *</Label>
            <Input
              placeholder="https://yourcompany.testrail.io"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Username *</Label>
              <Input
                placeholder="email@company.com"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">API Key *</Label>
              <Input
                type="password"
                placeholder="TestRail API key"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Project ID</Label>
              <Input
                placeholder="e.g. 1"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Suite ID</Label>
              <Input
                placeholder="e.g. 1"
                value={config.suiteId}
                onChange={(e) => setConfig({ ...config, suiteId: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handlePush} disabled={isPushing} className="gap-2">
            {isPushing ? (
              "Pushing..."
            ) : pushed ? (
              <>
                <Check className="w-4 h-4" /> Pushed Successfully
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Push Test Cases
              </>
            )}
          </Button>
          {pushed && (
            <span className="text-xs text-success font-medium">
              3 test cases synced to TestRail
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TestRailPush;
