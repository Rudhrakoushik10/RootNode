import { abimethod, Account, assert, Contract, GlobalState, Txn, Uint64 } from '@algorandfoundation/algorand-typescript'
import { BoxMap } from '@algorandfoundation/algorand-typescript'
import type { uint64, bytes } from '@algorandfoundation/algorand-typescript'

export class ReceiptAnchorContract extends Contract {
  owner = GlobalState<Account>()
  receiptCount = GlobalState<uint64>()
  hashExists = BoxMap<bytes, uint64>({ keyPrefix: 'hash' })
  receiptHashes = BoxMap<uint64, bytes>({ keyPrefix: 'receipt' })
  serviceReceipts = BoxMap<string, uint64>({ keyPrefix: 'service' })

  @abimethod({ allowActions: 'NoOp' })
  public initialize(owner: Account): void {
    this.owner.value = owner
    this.receiptCount.value = Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp' })
  public anchorReceipt(receiptHash: bytes, serviceId: string): uint64 {
    assert(!this.hashExists(receiptHash).exists, 'Receipt hash already exists - immutable')

    const receiptIdx = this.receiptCount.value
    this.hashExists(receiptHash).value = receiptIdx
    this.receiptHashes(receiptIdx).value = receiptHash
    this.serviceReceipts(serviceId).value = this.serviceReceipts(serviceId).get({ default: Uint64(0) }) + Uint64(1)
    this.receiptCount.value = receiptIdx + Uint64(1)

    return receiptIdx
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public verifyReceipt(receiptHash: bytes): boolean {
    return this.hashExists(receiptHash).exists
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getReceiptIndex(receiptHash: bytes): uint64 {
    assert(this.hashExists(receiptHash).exists, 'Receipt hash not found')
    return this.hashExists(receiptHash).value
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getReceiptHash(index: uint64): bytes {
    return this.receiptHashes(index).value
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getTotalReceipts(): uint64 {
    return this.receiptCount.value
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getServiceReceipt(serviceId: string): uint64 {
    if (this.serviceReceipts(serviceId).exists) {
      return this.serviceReceipts(serviceId).value
    }
    return Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getContractInfo(): [Account, uint64] {
    return [this.owner.value, this.receiptCount.value]
  }
}
