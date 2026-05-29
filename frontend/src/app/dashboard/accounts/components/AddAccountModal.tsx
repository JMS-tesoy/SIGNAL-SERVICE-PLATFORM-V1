import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Info, Loader2, X } from "lucide-react";
import type { AccountValidation, NewAccountForm } from "../types";
import { ValidatedInput } from "./ValidatedInput";

type AddAccountModalProps = {
  open: boolean;
  newAccount: NewAccountForm;
  validation: AccountValidation;
  error: string;
  isFreeAccount: boolean;
  isValid: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onChange: (account: NewAccountForm) => void;
  onError: (error: string) => void;
};

export function AddAccountModal({
  open,
  newAccount,
  validation,
  error,
  isFreeAccount,
  isValid,
  isLoading,
  onClose,
  onSubmit,
  onChange,
  onError,
}: AddAccountModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-background-secondary rounded-xl p-6 w-full max-w-md border border-border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Add MT5 Account</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  The login ID is verified after your matching MT5 terminal connects through the EA.
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-background-elevated rounded-lg active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <ValidatedInput
                id="mt5-account-id"
                name="accountId"
                label="MT5 Login ID *"
                value={newAccount.accountId}
                error={validation.accountId}
                placeholder="e.g., 12345678"
                inputMode="numeric"
                helpText="Use the login number shown in your MT5 terminal. Broker verification is confirmed by EA heartbeat."
                onChange={(value) => onChange({ ...newAccount, accountId: value })}
              />

              <div>
                <label htmlFor="mt5-account-type" className="block text-sm font-medium mb-2">Account Type *</label>
                <select
                  id="mt5-account-type"
                  name="accountType"
                  value={newAccount.accountType}
                  onChange={(event) => {
                    if (isFreeAccount && event.target.value === "MASTER") {
                      onError("Master Signal Provider accounts require a paid plan.");
                      return;
                    }
                    onChange({ ...newAccount, accountType: event.target.value as "MASTER" | "SLAVE" });
                  }}
                  className="input"
                >
                  <option value="SLAVE">Slave (Signal Receiver)</option>
                  <option value="MASTER" disabled={isFreeAccount}>
                    Master (Signal Provider){isFreeAccount ? " - Paid plan required" : ""}
                  </option>
                </select>
                {isFreeAccount && (
                  <p className="mt-2 flex items-start gap-2 text-xs text-foreground-muted">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    Master Signal Provider is visible for reference, but disabled on Free accounts. Upgrade to enable signal provider accounts.
                  </p>
                )}
              </div>

              <ValidatedInput
                id="mt5-broker"
                name="broker"
                label="Broker (Optional)"
                value={newAccount.broker}
                error={validation.broker}
                placeholder="e.g., IC Markets"
                onChange={(value) => onChange({ ...newAccount, broker: value })}
              />

              <ValidatedInput
                id="mt5-server"
                name="server"
                label="Server *"
                value={newAccount.server}
                error={validation.server}
                placeholder="e.g., ICMarkets-Demo"
                onChange={(value) => onChange({ ...newAccount, server: value })}
              />

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading || !isValid} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Account"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
