import React, { useState } from 'react';
import { useConnectivity } from '@/hooks/useConnectivity';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface OnlineStatusBadgeProps {
  variant?: 'full' | 'compact' | 'minimal';
  showDetailsOnClick?: boolean;
  className?: string;
}

export const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({
  variant = 'full',
  showDetailsOnClick = true,
  className = ''
}) => {
  const { isOnline, networkOnline, apiReachable, statusLabel, lastChecked, recheck } = useConnectivity();
  const [isChecking, setIsChecking] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    try {
      await recheck();
    } finally {
      setTimeout(() => setIsChecking(false), 400);
    }
  };

  const togglePopover = () => {
    if (showDetailsOnClick) {
      setPopoverOpen(!popoverOpen);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} className={className}>
      <button
        type="button"
        onClick={togglePopover}
        title={statusLabel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: variant === 'minimal' ? '3px 8px' : variant === 'compact' ? '4px 10px' : '5px 12px',
          borderRadius: 4,
          fontSize: variant === 'minimal' ? 10 : 11,
          fontFamily: 'var(--app-font-mono, monospace)',
          fontWeight: 600,
          letterSpacing: '0.06em',
          cursor: showDetailsOnClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          border: isOnline
            ? '1px solid rgba(16, 185, 129, 0.35)'
            : '1px solid rgba(245, 158, 11, 0.45)',
          background: isOnline
            ? 'rgba(16, 185, 129, 0.08)'
            : 'rgba(245, 158, 11, 0.12)',
          color: isOnline ? '#10b981' : '#f59e0b',
        }}
      >
        {/* Pulsing Dot Indicator */}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isOnline ? '#10b981' : '#f59e0b',
            boxShadow: isOnline
              ? '0 0 8px rgba(16, 185, 129, 0.8)'
              : '0 0 8px rgba(245, 158, 11, 0.8)',
            display: 'inline-block',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />

        {/* Icon */}
        {isOnline ? (
          <Wifi size={12} style={{ opacity: 0.9 }} />
        ) : (
          <WifiOff size={12} style={{ opacity: 0.9 }} />
        )}

        {/* Label Text */}
        <span className="online-badge-text">
          {variant === 'minimal' ? (
            isOnline ? 'ONLINE' : 'OFFLINE'
          ) : variant === 'compact' ? (
            isOnline ? 'ONLINE' : 'OFFLINE MODE'
          ) : (
            <>
              <span className="online-badge-full">
                {isOnline ? 'ONLINE · CLOUD CONNECTED' : 'OFFLINE · LOCAL CACHE'}
              </span>
              <span className="online-badge-compact">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </>
          )}
        </span>

        {/* Manual Refresh Spinner Button */}
        <span
          role="button"
          tabIndex={0}
          onClick={handleManualCheck}
          title="Recheck connectivity now"
          style={{
            marginLeft: 2,
            opacity: 0.7,
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={11} className={isChecking ? 'animate-spin' : ''} />
        </span>
      </button>

      {/* Floating Connectivity Diagnostics Dropdown */}
      {popoverOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 9999,
            width: 'min(280px, calc(100vw - 24px))',
            maxWidth: 'calc(100vw - 24px)',
            padding: '12px 14px',
            background: '#0d1520',
            border: '1px solid rgba(34, 211, 238, 0.25)',
            borderRadius: 6,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
            color: '#e2e8f0',
            fontFamily: 'var(--app-font-sans, sans-serif)',
            fontSize: 12,
            lineHeight: 1.5
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontWeight: 600, fontFamily: 'var(--app-font-mono, monospace)', fontSize: 11, letterSpacing: '0.08em', color: '#94a3b8' }}>
              CONNECTIVITY AUDIT
            </span>
            <span
              style={{
                fontSize: 10,
                color: isOnline ? '#10b981' : '#f59e0b',
                fontFamily: 'var(--app-font-mono, monospace)',
                fontWeight: 700
              }}
            >
              {isOnline ? 'SYNCED' : 'OFFLINE MODE'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#94a3b8' }}>Browser Network:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: networkOnline ? '#10b981' : '#ef4444' }}>
                {networkOnline ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {networkOnline ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#94a3b8' }}>FastAPI Backend:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: apiReachable ? '#10b981' : '#ef4444' }}>
                {apiReachable ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {apiReachable ? 'Operational' : 'Unreachable'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#94a3b8' }}>Offline PWA Shell:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}>
                <ShieldCheck size={11} /> Cached (Active)
              </span>
            </div>

            {lastChecked && (
              <div style={{ marginTop: 4, fontSize: 10, color: '#64748b', fontFamily: 'var(--app-font-mono, monospace)' }}>
                Heartbeat: {lastChecked.toLocaleTimeString()}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>
              {isOnline ? 'Cloud sync real-time' : 'Local deterministic models active'}
            </span>
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: 3,
                padding: '3px 8px',
                fontSize: 10,
                fontFamily: 'var(--app-font-mono, monospace)',
                cursor: 'pointer'
              }}
            >
              {isChecking ? 'Testing...' : 'Test Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
