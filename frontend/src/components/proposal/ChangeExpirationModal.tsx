import { FC } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useNetworkVariable } from "../../config/networkConfig";
import { useTransactionExecution } from "../../hooks/useTransactionExecution";
import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useSuperAdminCap } from "../../hooks/useSuperAdminCap";

interface ChangeExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  currentExpiration: number;
  onSuccess: () => void;
}

export const ChangeExpirationModal: FC<ChangeExpirationModalProps> = ({
  isOpen,
  onClose,
  proposalId,
  currentExpiration,
  onSuccess,
}) => {
  const packageId = useNetworkVariable("packageId");
  const { executeTransaction } = useTransactionExecution();
  const suiClient = useSuiClient();
  const { superAdminCapId } = useSuperAdminCap();

  const handleChangeExpiration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newExpiration = formData.get("expiration") as string;
    
    if (!newExpiration) return;

    const newExpirationMs = new Date(newExpiration).getTime();

    if (!superAdminCapId) {
      console.error("No SuperAdminCap found");
      return;
    }

    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::proposal::change_expiration_date`,
      arguments: [
        tx.object(proposalId),
        tx.object(superAdminCapId),
        tx.pure.u64(newExpirationMs),
      ],
    });

    try {
      await executeTransaction(tx);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to change expiration date:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-black/90 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Change Proposal Expiration Date</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleChangeExpiration} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expiration" className="text-white">
              New Expiration Date
            </Label>
            <Input
              id="expiration"
              name="expiration"
              type="datetime-local"
              className="bg-white/10 border-white/20 text-white"
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Change Expiration
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 