import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useEffect } from "react";

export const useTransactionExecution = () => {
  const { mutate: signAndExecute, isPending, isSuccess, isError, reset } = useSignAndExecuteTransaction();

  // Auto-reset transaction state after success or error
  useEffect(() => {
    if (isSuccess || isError) {
      // Add a slight delay before resetting to ensure UI updates
      const timeoutId = setTimeout(() => {
        reset();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isSuccess, isError, reset]);

  const executeTransaction = async (tx: Transaction) => {
    return signAndExecute({
      transaction: tx.serialize(),
    });
  };

  return { executeTransaction, isPending, isSuccess, isError, reset };
}; 