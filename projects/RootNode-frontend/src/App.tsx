import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import TaskInput from './components/TaskInput';
import MetricCards from './components/MetricCards';
import SpendTracker from './components/SpendTracker';
import TransactionFeed from './components/TransactionFeed';
import ReceiptLog from './components/ReceiptLog';
import ContractStatus from './components/ContractStatus';
import { sendTask } from './api/client';

export default function App() {
  const [agentStatus] = useState('running');
  const [taskLoading, setTaskLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [taskResult, setTaskResult] = useState<{
    status: string;
    service_name?: string;
    amount_algo?: number;
    txid?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleTaskSubmit = async (taskText: string) => {
    setTaskLoading(true);
    setTaskResult(null);
    
    try {
      const response = await sendTask(taskText);
      setTaskResult(response.data);
    } catch (error: unknown) {
      const err = error as { offline?: boolean; message?: string };
      
      if (err.offline) {
        setTaskResult({
          status: 'error',
          message: 'Backend offline — cannot process task',
        });
      } else {
        setTaskResult({
          status: 'error',
          message: err.message || 'Failed to submit task',
        });
      }
    } finally {
      setTaskLoading(false);
    }
  };

  return (
    <div className={`min-h-screen theme-transition ${isDark ? 'bg-[#0f1117] text-[#e2e8f0]' : 'bg-beige-50 text-olive-dark'}`}>
      <TopBar agentStatus={agentStatus} isDark={isDark} onThemeToggle={handleThemeToggle} />
      
      <main className="max-w-[1280px] mx-auto px-6 py-5 space-y-5">
        <div className="w-full">
          <TaskInput 
            onTaskSubmit={handleTaskSubmit} 
            loading={taskLoading} 
            result={taskResult}
            isDark={isDark}
          />
        </div>

        <div className="w-full">
          <MetricCards isDark={isDark} />
        </div>

        <div className="w-full">
          <SpendTracker isDark={isDark} />
        </div>

        <div className="grid grid-cols-2 gap-5 h-[500px]">
          <TransactionFeed isDark={isDark} />
          <ReceiptLog isDark={isDark} />
        </div>

        <div className="w-full">
          <ContractStatus isDark={isDark} />
        </div>
      </main>
    </div>
  );
}