import { useWallet } from '@txnlab/use-wallet-react'

export function WalletConnect() {
  const { wallets, activeAddress, activeWallet } = useWallet()

  if (activeAddress) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-gray-400">Connected: </span>
          <span className="font-mono text-green-400">
            {activeAddress.slice(0, 8)}...{activeAddress.slice(-8)}
          </span>
        </div>
        <button onClick={() => activeWallet?.disconnect()} className="btn btn-sm btn-outline btn-error">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {wallets.map((wallet) => (
        <button key={wallet.id} onClick={() => wallet.connect()} className="btn btn-primary">
          Connect {wallet.metadata.name}
        </button>
      ))}
    </div>
  )
}
