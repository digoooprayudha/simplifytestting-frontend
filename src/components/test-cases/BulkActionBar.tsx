import { useState } from "react";
import { CheckCheck, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  count: number;
  onApprove: () => void;
  onDelete: () => void;
  onChangeStatus: (status: string) => void;
  onClear: () => void;
}

export const BulkActionBar = ({ count, onApprove, onDelete, onChangeStatus, onClear }: Props) => {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (count === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
        <span className="text-sm font-medium text-foreground">{count} selected</span>
        <div className="w-px h-6 bg-border" />
        <Button size="sm" variant="outline" onClick={onApprove} className="gap-1">
          <CheckCheck className="w-3.5 h-3.5" /> Approve
        </Button>
        <Select onValueChange={onChangeStatus}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Change status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="refined">Refined</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)} className="gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground ml-1">Clear</button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} test cases?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDelete(); setDeleteOpen(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
