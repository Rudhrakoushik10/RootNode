import { abimethod, Account, assert, Contract, GlobalState, Txn, Uint64 } from '@algorandfoundation/algorand-typescript'
import type { uint64, bytes } from '@algorandfoundation/algorand-typescript'

export class ReceiptAnchorContract extends Contract {
  owner = GlobalState<Account>()
  receiptCount = GlobalState<uint64>()
  lastReceiptHash = GlobalState<bytes>()
  lastServiceId = GlobalState<string>()
  lastReceiptIndex = GlobalState<uint64>()

  @abimethod({ allowActions: 'NoOp' })
  public initialize(owner: Account): void {
    this.owner.value = owner
    this.receiptCount.value = Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp' })
  public anchorReceipt(receiptHash: bytes, serviceId: string): uint64 {
    const receiptIdx = this.receiptCount.value
    
    this.lastReceiptHash.value = receiptHash
    this.lastServiceId.value = serviceId
    this.lastReceiptIndex.value = receiptIdx
    
    this.receiptCount.value = receiptIdx + Uint64(1)

    return receiptIdx
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public verifyReceipt(receiptHash: bytes): boolean {
    if (this.lastReceiptHash.value === receiptHash) {
      return true
    }
    return false
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getReceiptIndex(receiptHash: bytes): uint64 {
    assert(this.lastReceiptHash.value === receiptHash, 'Receipt hash not found')
    return this.lastReceiptIndex.value
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getReceiptHash(index: uint64): bytes {
    if (this.lastReceiptIndex.value === index) {
      return this.lastReceiptHash.value
    }
    return this.lastReceiptHash.value
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getTotalReceipts(): uint64 {
    return this.receiptCount.value
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getServiceReceipt(serviceId: string): uint64 {
    if (this.lastServiceId.value === serviceId) {
      return Uint64(1)
    }
    return Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getContractInfo(): [Account, uint64] {
    return [this.owner.value, this.receiptCount.value]
  }
}