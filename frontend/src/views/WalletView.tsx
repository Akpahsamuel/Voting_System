import { WalletStatus } from "../components/wallet/Status";


const WalletView = () => {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Your Wallet Info</h1>
          <WalletStatus />
        </div>
      </>
    )
};

export default WalletView;