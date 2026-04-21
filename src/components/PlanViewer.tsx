import type { FC } from 'react';
import { useState } from 'react';
import type { Plan } from '@/types';

interface PlanViewerProps {
  plan: Plan;
  onApprove: () => void;
  onReject: () => void;
  isExecuting?: boolean;
}

const PlanViewer: FC<PlanViewerProps> = ({ plan, onApprove, onReject, isExecuting }) => {
  const [mode, setMode] = useState<'ask' | 'act'>('ask');

  return (
    <div className="plan-container">
      <div className="plan-header">
        <p style={{marginBottom: '12px', fontSize: '13px'}}>AI: I'll help you analyze this page. Here's my plan:</p>
      </div>

      <div 
        className={`plan-option ${mode === 'ask' ? 'selected' : ''}`}
        onClick={() => setMode('ask')}
      >
        <div className="radio-dot" />
        <div className="plan-text">
          <h4>Ask before acting</h4>
          <p>Muwahhid aligns on its approach before taking actions</p>
        </div>
      </div>

      <div 
        className={`plan-option ${mode === 'act' ? 'selected' : ''}`}
        onClick={() => setMode('act')}
      >
        <div className="radio-dot" />
        <div className="plan-text">
          <h4>Act without asking</h4>
          <p>Muwahhid takes actions without asking for permission</p>
        </div>
      </div>

      <div className="plan-details" style={{marginTop: '16px', borderTop: '1px solid #3F3F46', paddingTop: '12px'}}>
        {plan.phases.map((phase) => (
          <div key={phase.id} className="plan-phase">
            <div className="phase-header">{phase.title}</div>
            {phase.steps.map((step) => (
              <div key={step.id} className={`step-item ${isExecuting ? 'executing-step' : ''}`}>
                {step.description}
              </div>
            ))}
          </div>
        ))}
      </div>

      {isExecuting ? (
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: '60%', animation: 'shimmer 2s infinite linear' }} />
          <p style={{ fontSize: '10px', color: 'var(--accent-color)', marginTop: '8px', textAlign: 'center', fontWeight: 'bold' }}>
            AUTONOMOUS EXECUTION IN PROGRESS...
          </p>
        </div>
      ) : (
        <div className="plan-actions">
          <button className="btn-plan btn-proceed" onClick={onApprove}>
            ✓ Proceed
          </button>
          <button className="btn-plan btn-cancel" onClick={onReject}>
            ✗ Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default PlanViewer;
