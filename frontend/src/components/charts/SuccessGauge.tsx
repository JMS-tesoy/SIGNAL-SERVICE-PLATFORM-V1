'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Gauge } from 'lucide-react';

interface SuccessGaugeProps {
  rate?: number;
  isLoading?: boolean;
}

export function SuccessGauge({ rate = 0, isLoading }: SuccessGaugeProps) {
  const [isClient, setIsClient] = useState(false);

  // Animated value
  const springValue = useSpring(0, { stiffness: 50, damping: 20 });

  useEffect(() => {
    setIsClient(true);
    springValue.set(rate);
  }, [rate, springValue]);

  // Calculate colors based on rate
  const getColor = (value: number) => {
    if (value >= 70) return '#22c55e';
    if (value >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getColorClass = (value: number) => {
    if (value >= 70) return 'text-accent-green';
    if (value >= 50) return 'text-accent-yellow';
    return 'text-accent-red';
  };

  const getLabel = (value: number) => {
    if (value >= 80) return 'Excellent';
    if (value >= 70) return 'Great';
    if (value >= 60) return 'Good';
    if (value >= 50) return 'Fair';
    return 'Needs Work';
  };

  // SVG arc calculations
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const offset = circumference - (rate / 100) * circumference;

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex flex-col items-center"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 self-start">
        <div className="p-2.5 rounded-xl bg-accent-cyan/10">
          <Gauge className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Success Rate</h3>
          <p className="text-sm text-foreground-muted">Overall performance</p>
        </div>
      </div>

      {/* Gauge */}
      <div className="relative" style={{ width: size, height: size / 2 + 40 }}>
        <svg
          width={size}
          height={size / 2 + 20}
          className="transform -rotate-0"
          style={{ overflow: 'visible' }}
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Animated progress arc */}
          {isClient && (
            <motion.path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke={getColor(rate)}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{
                filter: `drop-shadow(0 0 8px ${getColor(rate)}50)`,
              }}
            />
          )}

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180;
            const radian = (angle * Math.PI) / 180;
            const x1 = size / 2 + (radius - strokeWidth) * Math.cos(Math.PI - radian);
            const y1 = size / 2 - (radius - strokeWidth) * Math.sin(Math.PI - radian);
            const x2 = size / 2 + (radius + 10) * Math.cos(Math.PI - radian);
            const y2 = size / 2 - (radius + 10) * Math.sin(Math.PI - radian);

            return (
              <g key={tick}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--foreground-subtle)"
                  strokeWidth={2}
                  opacity={0.5}
                />
                <text
                  x={x2 + (tick === 0 ? -8 : tick === 100 ? 8 : 0)}
                  y={y2 + (tick === 50 ? -8 : 4)}
                  textAnchor="middle"
                  className="text-xs fill-foreground-subtle"
                >
                  {tick}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center content */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
          <motion.p
            className={`font-display text-4xl font-bold ${getColorClass(rate)}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
          >
            {rate.toFixed(1)}%
          </motion.p>
          <motion.p
            className="text-foreground-muted text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {getLabel(rate)}
          </motion.p>
        </div>
      </div>

      {/* Stats bar */}
      <motion.div
        className="flex items-center justify-center gap-6 mt-4 w-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          <span className="text-sm text-foreground-muted">&gt;70% Great</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-yellow" />
          <span className="text-sm text-foreground-muted">50-70% Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-red" />
          <span className="text-sm text-foreground-muted">&lt;50% Low</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
