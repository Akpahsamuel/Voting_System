import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

export const useTransactionExecution = () => {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const executeTransaction = async (tx: Transaction) => {
    return signAndExecute({
      transaction: tx,
    });
  };

  return { executeTransaction };
}; 