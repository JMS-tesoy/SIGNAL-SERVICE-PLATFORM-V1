'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ElementType } from 'react';
import { formatMetricValue } from '../utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ElementType;
  color: string;
}

export function StatCard({ title, value, change, icon: Icon, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card min-w-0 p-4 sm:p-5 xl:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${color}`}>
          <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
        {change !== undefined && (
          <div className={`flex flex-shrink-0 items-center gap-1 text-xs sm:text-sm ${change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="mb-1 truncate text-sm text-foreground-muted">{title}</p>
      <p className="break-words text-2xl font-bold leading-tight sm:text-3xl">
        {formatMetricValue(value)}
      </p>
    </motion.div>
  );
}
