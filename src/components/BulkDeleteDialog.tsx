import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
}

export const BulkDeleteDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  count 
}: BulkDeleteDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const requiredText = "DELETE";
  const isValid = confirmText === requiredText;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm();
      setConfirmText("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Delete {count} Cases?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action cannot be undone. This will permanently delete <strong>{count}</strong> case{count > 1 ? 's' : ''} 
              and remove all associated data including comments, activities, and legal memos.
            </p>
            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-delete" className="text-sm font-medium text-foreground">
                Type <span className="font-mono bg-muted px-2 py-0.5 rounded text-destructive">{requiredText}</span> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type DELETE here"
                className={`font-mono ${!isValid && confirmText ? 'border-destructive' : ''}`}
                autoComplete="off"
              />
              {confirmText && !isValid && (
                <p className="text-xs text-destructive">
                  Please type exactly "{requiredText}" to proceed
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-destructive hover:bg-destructive/90 disabled:opacity-50"
          >
            Delete {count} Case{count > 1 ? 's' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
