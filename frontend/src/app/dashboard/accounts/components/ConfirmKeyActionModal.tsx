import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import type { KeyAction, MT5Account } from "../types";

type ConfirmKeyActionModalProps = {
  action: { account: MT5Account; type: KeyAction } | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmKeyActionModal({ action, onCancel, onConfirm }: ConfirmKeyActionModalProps) {
  return (
    <AnimatePresence>
      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-md rounded-xl border border-border bg-background-secondary p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10 text-accent-yellow">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {action.type === "revoke" ? "Revoke API key?" : "Regenerate API key?"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-foreground-muted">
                  {action.type === "revoke"
                    ? "The EA using this key will stop connecting until a new key is generated and copied into MT5."
                    : "The old key will stop working immediately. You must copy the new key into your MT5 EA."}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onCancel} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="button" onClick={onConfirm} className="btn-primary flex-1">
                {action.type === "revoke" ? "Revoke key" : "Regenerate"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
