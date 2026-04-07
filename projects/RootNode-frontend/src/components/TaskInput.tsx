import React from 'react';

interface TaskInputProps {
  onTaskSubmit: (taskText: string) => void;
  loading: boolean;
  result: { status: string; message?: string; service_name?: string; amount_algo?: number; txid?: string } | null;
  isDark?: boolean;
}

const STAGES = [
  "Interpreting",
  "Discovering services",
  "Policy check",
  "Escrow lock",
  "Calling API",
  "Receipt generated"
];

export default function TaskInput({ onTaskSubmit, loading, result, isDark = false }: TaskInputProps) {
  const [taskText, setTaskText] = React.useState('');
  const [currentStage, setCurrentStage] = React.useState(-1);
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    if (loading) {
      setCurrentStage(0);
      const interval = setInterval(() => {
        setCurrentStage(prev => (prev < STAGES.length - 1 ? prev + 1 : prev));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setCurrentStage(-1);
      if (result) {
        setShowBanner(true);
        const timer = setTimeout(() => setShowBanner(false), 5000);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [loading, result]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskText.trim() && !loading) {
      onTaskSubmit(taskText);
    }
  };

  const inputBg = isDark ? 'bg-[#1e293b]' : 'bg-beige-50';
  const inputBorder = isDark ? 'border-[#334155]' : 'border-beige-200';
  const inputText = isDark ? 'text-[#e2e8f0]' : 'text-olive-dark';
  const inputPlaceholder = isDark ? 'placeholder-[#475569]' : 'placeholder-beige-300';
  
  const cardBg = isDark ? 'bg-[#1a1d27]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#2d3148]' : 'border-beige-200';
  const headingText = isDark ? 'text-[#e2e8f0]' : 'text-olive-dark';
  const subText = isDark ? 'text-[#475569]' : 'text-olive/60';

  return (
    <div className={`${cardBg} border ${cardBorder} rounded-[10px] p-4 flex flex-col gap-4`}>
      <div className="flex justify-between items-center">
        <h3 className={`text-[13px] font-medium ${headingText}`}>Send task to agent</h3>
        <span className={`text-[11px] ${subText}`}>Agent will autonomously purchase required APIs</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          disabled={loading}
          placeholder='e.g. "Get real-time weather for Chennai" or "Fetch satellite imagery for Wayanad flood zone"'
          className={`flex-1 ${inputBg} border ${inputBorder} rounded-[8px] px-3.5 py-2.5 text-[13px] ${inputText} ${inputPlaceholder} focus:outline-none ${isDark ? 'focus:border-[#3b82f6]' : 'focus:border-olive'} transition-colors`}
        />
        <button
          type="submit"
          disabled={loading || !taskText.trim()}
          className={`${isDark ? 'bg-[#3b82f6] hover:bg-[#2563eb]' : 'bg-olive hover:bg-olive-dark'} disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[8px] px-5 py-2.5 text-[13px] font-medium flex items-center gap-2 transition-colors min-w-[140px] justify-center`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Agent running...
            </>
          ) : "Run agent"}
        </button>
      </form>

      {loading && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STAGES.map((stage, idx) => (
            <div key={stage} className="flex items-center gap-2 shrink-0">
              <div className={`px-2 py-1 rounded-[4px] text-[11px] font-medium ${
                isDark 
                  ? (idx < currentStage ? 'bg-[#14532d] text-[#4ade80]' : idx === currentStage ? 'bg-[#0c1a35] text-[#3b82f6]' : 'bg-[#1e293b] text-[#475569]')
                  : (idx < currentStage ? 'bg-olive/20 text-olive-dark' : idx === currentStage ? 'bg-olive/10 text-olive border border-olive/30' : 'bg-beige-100 text-olive/60')
              }`}>
                {stage}
              </div>
              {idx < STAGES.length - 1 && <span className={isDark ? 'text-[#475569]' : 'text-olive/40'}>→</span>}
            </div>
          ))}
        </div>
      )}

      {showBanner && result && (
        <div className={`p-3 rounded-[8px] text-[13px] ${
          isDark 
            ? (result.status === 'success' ? 'bg-[#14532d] text-[#4ade80]' : 'bg-[#450a0a] text-[#f87171]')
            : (result.status === 'success' ? 'bg-olive/10 text-olive-dark border border-olive/30' : 'bg-red-50 text-red-700 border border-red-200')
        }`}>
          {result.status === 'success' ? (
            <div className="flex flex-col gap-1">
              <p>Task completed — {result.service_name} purchased for {result.amount_algo} ALGO</p>
              <p className={`text-[11px] ${isDark ? 'opacity-80' : 'opacity-70'}`}>· TxID: {result.txid}</p>
            </div>
          ) : (
            <p>{result.message || "Policy rejected — amount exceeds per-call limit"}</p>
          )}
        </div>
      )}
    </div>
  );
}