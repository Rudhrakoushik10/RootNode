import { 
  abimethod, Account, assert, Contract, GlobalState, Txn, Uint64
} from '@algorandfoundation/algorand-typescript'
import { BoxMap } from '@algorandfoundation/algorand-typescript'
import type { uint64 } from '@algorandfoundation/algorand-typescript'

export class PolicyContract extends Contract {
  owner = GlobalState<Account>()
  maxPerCall = GlobalState<uint64>()
  totalBudget = GlobalState<uint64>()
  totalSpent = GlobalState<uint64>()
  
  categoryWhitelist = BoxMap<string, uint64>({ keyPrefix: 'cat_' })
  
  categoriesUsed = GlobalState<uint64>()
  rejectionsCount = GlobalState<uint64>()

  @abimethod({ allowActions: 'NoOp' })
  public initialize(owner: Account, maxPerCallMicroAlgos: uint64, totalBudgetMicroAlgos: uint64): void {
    this.owner.value = owner
    this.maxPerCall.value = maxPerCallMicroAlgos
    this.totalBudget.value = totalBudgetMicroAlgos
    this.totalSpent.value = Uint64(0)
    this.categoriesUsed.value = Uint64(0)
    this.rejectionsCount.value = Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp' })
  public createCategoryBox(category: string): void {
    assert(Txn.sender === this.owner.value, 'Only owner can create boxes')
    this.categoryWhitelist(category).value = Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp' })
  public addCategory(category: string): void {
    assert(Txn.sender === this.owner.value, 'Only owner can modify whitelist')
    this.categoryWhitelist(category).value = Uint64(1)
    this.categoriesUsed.value = this.categoriesUsed.value + Uint64(1)
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public isCategoryAllowed(category: string): boolean {
    const val = this.categoryWhitelist(category).get({ default: Uint64(0) })
    return val === Uint64(1)
  }

  @abimethod({ allowActions: 'NoOp' })
  public recordRejection(): void {
    this.rejectionsCount.value = this.rejectionsCount.value + Uint64(1)
  }

  @abimethod({ allowActions: 'NoOp' })
  public recordSpend(amount: uint64): void {
    assert(Txn.sender === this.owner.value, 'Only owner can record spend')
    this.totalSpent.value = this.totalSpent.value + amount
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public validateTransaction(amountMicroAlgos: uint64, category: string): boolean {
    if (amountMicroAlgos > this.maxPerCall.value) {
      return false
    }

    const newTotal: uint64 = this.totalSpent.value + amountMicroAlgos
    if (newTotal > this.totalBudget.value) {
      return false
    }

    const isAllowed = this.isCategoryAllowed(category)
    if (!isAllowed) {
      return false
    }

    return true
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getPolicyStatus(): [uint64, uint64, uint64, uint64, uint64] {
    return [
      this.maxPerCall.value,
      this.totalBudget.value,
      this.totalSpent.value,
      this.totalBudget.value - this.totalSpent.value,
      this.rejectionsCount.value,
    ]
  }
}
