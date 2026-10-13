import React from 'react';

/**
 * Reusable Admin Summary Stat Card
 * Uses robust inline style tokens and class names to guarantee card layout across all browsers.
 */
export default function AdminSummaryCard({
  title,
  value,
  icon,
  subtitle,
  color = 'indigo',
  loading = false
}) {
  const colorMap = {
    indigo: {
      bg: 'rgba(99, 102, 241, 0.15)',
      color: '#818cf8',
      border: 'rgba(99, 102, 241, 0.3)',
    },
    amber: {
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    emerald: {
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#34d399',
      border: 'rgba(16, 185, 129, 0.3)',
    },
    purple: {
      bg: 'rgba(139, 92, 246, 0.15)',
      color: '#c084fc',
      border: 'rgba(139, 92, 246, 0.3)',
    },
    rose: {
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#f87171',
      border: 'rgba(239, 68, 68, 0.3)',
    },
    sky: {
      bg: 'rgba(14, 165, 233, 0.15)',
      color: '#38bdf8',
      border: 'rgba(14, 165, 233, 0.3)',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div
      className="adm-stat-card"
      style={{
        backgroundColor: '#0b1329',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        minHeight: '125px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94a3b8',
              display: 'block',
              marginBottom: '0.35rem',
            }}
          >
            {title}
          </span>
          {loading ? (
            <div
              style={{
                height: '28px',
                width: '70px',
                backgroundColor: '#1e293b',
                borderRadius: '6px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ) : (
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: '900',
                color: '#ffffff',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}
            >
              {value ?? 0}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              backgroundColor: scheme.bg,
              color: scheme.color,
              border: `1px solid ${scheme.border}`,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#64748b',
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(30, 41, 59, 0.8)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
