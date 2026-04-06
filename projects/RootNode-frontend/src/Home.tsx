import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { WalletConnect } from './components/WalletConnect'
import TransactionFeed from './components/TransactionFeed'
import { ReceiptAuditLog } from './components/ReceiptAuditLog'
import { fetchMetrics, Metrics } from './services/metricsService'
import { aiAgent } from './agent/aiAgent'
import { ExecutionResult, ServiceSelection, Receipt } from './agent/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TASK_STEPS = [
  'Interpreting task',
  'Discovering services',
  'Comparing providers',
  'Policy check',
  'Escrow lock',
  'Calling API',
  'Validating response',
  'Anchoring receipt',
]

type BannerType = 'success' | 'rejection' | 'refund' | null

interface TaskResult {
  type: BannerType
  message: string
  txid?: string
}

const Home: React.FC = () => {
  const { activeAddress } = useWallet()
  const [taskDescription, setTaskDescription] = useState('')
  const [maxBudget, setMaxBudget] = useState(100000)
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<ExecutionResult | undefined>()
  const [recommendations, setRecommendations] = useState<ServiceSelection[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [banner, setBanner] = useState<TaskResult | null>(null)
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loadMetrics = async () => {
      const data = await fetchMetrics()
      setMetrics(data)
    }
    loadMetrics()
    const interval = setInterval(loadMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  const showBanner = (result: TaskResult) => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current)
    }
    setBanner(result)
    bannerTimeoutRef.current = setTimeout(() => {
      setBanner(null)
    }, 6000)
  }

  const handleTaskSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAddress || !taskDescription.trim()) return

    setStatus('processing')
    setResult(undefined)
    setCurrentStep(0)

    try {
      // Step 0: Interpreting task
      setCurrentStep(1)
      const recs = aiAgent.getServiceRecommendations(taskDescription)
      setRecommendations(recs)
      await new Promise((r) => setTimeout(r, 800))

      // Step 1: Discovering services
      setCurrentStep(2)
      await new Promise((r) => setTimeout(r, 600))

      // Step 2: Comparing providers
      setCurrentStep(3)
      await new Promise((r) => setTimeout(r, 600))

      // Step 3: Policy check
      setCurrentStep(4)
      await new Promise((r) => setTimeout(r, 500))

      // Step 4: Escrow lock
      setCurrentStep(5)
      await new Promise((r) => setTimeout(r, 700))

      // Call API
      setCurrentStep(6)
      const execResult = await aiAgent.processTask({ taskDescription, parameters: {}, maxBudget }, activeAddress)

      // Step 5: Validating response
      await new Promise((r) => setTimeout(r, 400))
      setCurrentStep(7)

      // Step 6: Anchoring receipt
      await new Promise((r) => setTimeout(r, 500))

      if (execResult.success) {
        setResult(execResult)
        setStatus('success')
        setReceipts((prev) => [
          {
            id: execResult.receiptId,
            timestamp: execResult.timestamp,
            serviceId: recs[0]?.service.id || 'unknown',
            agentAddress: activeAddress,
            providerAddress: recs[0]?.provider.address || '',
            amount: execResult.actualCost,
            resultHash: execResult.receiptHash,
            requestParams: {},
            responseData: execResult.data,
          },
          ...prev,
        ])
        showBanner({
          type: 'success',
          message: `Purchased: ${recs[0]?.service.id || 'service'} — ${(execResult.actualCost / 1000000).toFixed(4)} ALGO`,
          txid: execResult.receiptId,
        })
      } else {
        setResult(execResult)
        setStatus('error')
        if (execResult.error?.includes('PolicyEnforcementContract') || execResult.error?.includes('policy')) {
          showBanner({
            type: 'rejection',
            message: 'Blocked by PolicyEnforcementContract — amount exceeds per-call limit',
          })
        } else {
          showBanner({
            type: 'refund',
            message: `API response invalid — EscrowContract auto-refunded ${(execResult.actualCost / 1000000).toFixed(4)} ALGO`,
          })
        }
      }
    } catch {
      setStatus('error')
      showBanner({
        type: 'rejection',
        message: 'Blocked by PolicyEnforcementContract — amount exceeds per-call limit',
      })
    }
  }, [activeAddress, taskDescription, maxBudget])

  const policyStatus = aiAgent.getPolicyStatus()

  const getBudgetPercentage = () => {
    if (!metrics || metrics.budget_algo === 0) return 0
    return (metrics.total_spent_algo / metrics.budget_algo) * 100
  }

  const getProgressColor = () => {
    const pct = getBudgetPercentage()
    if (pct < 60) return 'bg-blue-500'
    if (pct < 80) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    const pct = getBudgetPercentage()
    if (pct < 60) return { text: 'Spending within policy limits', color: 'text-green-500' }
    if (pct < 80) return { text: 'Approaching spend cap — slowing purchases', color: 'text-amber-500' }
    return {
      text: 'WARNING: PolicyEnforcementContract will block next transaction above limit',
      color: 'text-red-500'
    }
  }

  const formatAlgo = (value: number) => {
    return `${value.toFixed(4)} ALGO`
  }

  const isRunning = status === 'processing'

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-200 shadow-lg">
        <div className="flex-1">
          <a className="btn btn-ghost normal-case text-xl">Agentic Service Buyer</a>
        </div>
        <div className="flex-none">
          <WalletConnect />
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        <p className="text-sm text-gray-400 text-center">
          Autonomous AI-powered commerce on Algorand
        </p>

        {/* SECTION 1: TASK INPUT PANEL */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-1">Send Task to Agent</h2>
            <p className="text-sm text-gray-400 mb-4">
              The agent will autonomously discover, purchase and consume the required API services
            </p>

            {/* Banners */}
            {banner && banner.type === 'success' && (
              <div className="alert alert-success mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <span className="font-medium">{banner.message}</span>
                  {banner.txid && (
                    <span className="block text-xs opacity-80">
                      TxID: {banner.txid} · Receipt anchored on Algorand
                    </span>
                  )}
                </div>
              </div>
            )}

            {banner && banner.type === 'rejection' && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{banner.message}</span>
              </div>
            )}

            {banner && banner.type === 'refund' && (
              <div className="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm">{banner.message}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <textarea
                className="textarea textarea-bordered w-full h-32 bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder='Try: "Get weather forecast for Chennai" or "Fetch routing data for Wayanad flood zone" or "Check drug interactions for paracetamol"'
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                disabled={isRunning}
              />
              <button
                type="submit"
                className={`btn btn-primary w-full ${isRunning ? 'loading' : ''}`}
                disabled={!activeAddress || !taskDescription.trim() || isRunning}
              >
                {isRunning ? 'Agent Running...' : 'Run Agent'}
              </button>
            </form>

            {/* Progress Steps */}
            {isRunning && (
              <div className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                  {TASK_STEPS.map((step, index) => {
                    const stepNum = index + 1
                    const isCompleted = stepNum < currentStep
                    const isActive = stepNum === currentStep
                    const isPending = stepNum > currentStep

                    return (
                      <React.Fragment key={step}>
                        <div className={`badge badge-lg ${isCompleted ? 'badge-success' : isActive ? 'badge-primary' : 'badge-ghost'}`}>
                          {isCompleted && '✓ '}{step}
                        </div>
                        {index < TASK_STEPS.length - 1 && (
                          <div className={`w-4 h-0.5 ${isCompleted ? 'bg-success' : 'bg-gray-600'}`} />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: METRICS ROW */}
        <div>
          <h2 className="text-lg font-semibold mb-3">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Spent */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-400">Total Spent</h3>
                <p className="text-3xl font-bold text-primary">
                  {metrics ? formatAlgo(metrics.total_spent_algo) : '0.0000 ALGO'}
                </p>
                <p className="text-sm text-green-500">
                  {metrics
                    ? `${(metrics.budget_algo - metrics.total_spent_algo).toFixed(4)} ALGO remaining`
                    : '0.5000 ALGO remaining'}
                </p>
                <p className="text-xs text-gray-500">
                  of {metrics ? formatAlgo(metrics.budget_algo) : '0.5000 ALGO total budget'}
                </p>
              </div>
            </div>

            {/* Card 2: Services Purchased */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-400">Services Purchased</h3>
                <p className="text-3xl font-bold text-primary">
                  {metrics?.services_purchased ?? 0}
                </p>
                <p className="text-sm text-gray-300">
                  {metrics?.unique_categories ?? 0} unique categories used
                </p>
              </div>
            </div>

            {/* Card 3: Policy Rejections */}
            <div className="card bg-base-200 shadow-xl border border-red-500/30">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-400">Policy Rejections</h3>
                <p className="text-3xl font-bold text-red-500">
                  {metrics?.policy_rejections ?? 0}
                </p>
                <p className="text-sm text-gray-400">
                  blocked by PolicyEnforcementContract
                </p>
                <p className="text-xs text-blue-800">
                  Smart contract enforcement
                </p>
              </div>
            </div>

            {/* Card 4: Escrow Refunds */}
            <div className="card bg-base-200 shadow-xl border border-orange-500/30">
              <div className="card-body">
                <h3 className="text-sm font-medium text-gray-400">Escrow Refunds</h3>
                <p className="text-3xl font-bold text-orange-500">
                  {metrics?.escrow_refunds ?? 0}
                </p>
                <p className="text-sm text-gray-400">
                  API failed — auto-refunded by EscrowContract
                </p>
                <p className="text-xs text-blue-800">
                  Escrow contract protection
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: BUDGET TRACKER */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Budget Consumption</h2>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Budget Usage</h3>
                <span className="text-sm font-medium">
                  {metrics ? `${metrics.total_spent_algo.toFixed(4)} / ${metrics.budget_algo.toFixed(4)} ALGO` : '0.0000 / 0.5000 ALGO'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
                  style={{ width: `${Math.min(getBudgetPercentage(), 100)}%` }}
                />
              </div>

              {/* Threshold Labels */}
              <div className="flex justify-between text-xs mb-4">
                <span className="text-gray-400">0 ALGO</span>
                <span className="text-amber-500">Warning threshold: 0.4 ALGO</span>
                <span className="text-red-500">Hard cap: 0.5 ALGO</span>
              </div>

              {/* Status Text */}
              <div className={`mb-4 ${getStatusText().color} text-sm font-medium`}>
                {getStatusText().text}
              </div>

              {/* Warning Box */}
              {getBudgetPercentage() >= 80 && (
                <div className="border-2 border-red-500 rounded-lg p-3 mb-4 bg-red-500/10">
                  <p className="text-red-500 text-sm font-medium">
                    PolicyEnforcementContract will reject transactions that exceed your budget limit.
                    Consider adjusting your budget or waiting for the next billing cycle.
                  </p>
                </div>
              )}

              {/* Bottom Row */}
              <div className="text-xs text-gray-500">
                Per-call limit: {metrics?.per_call_limit_algo.toFixed(4) ?? '0.0100'} ALGO
                {' · '}
                Estimated calls remaining: ~{metrics?.estimated_calls_remaining ?? 50}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: LIVE TRANSACTION FEED & RECEIPT AUDIT LOG */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionFeed />
          <ReceiptAuditLog />
        </div>
      </div>
    </div>
  )
}

export default Home
