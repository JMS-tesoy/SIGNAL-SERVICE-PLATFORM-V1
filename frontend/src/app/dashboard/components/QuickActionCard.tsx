'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ElementType } from 'react';

interface QuickActionCardProps {
  href: string;
  icon: ElementType;
  title: string;
  description: string;
  toneClassName: string;
  hoverBorderClassName: string;
}

export function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  toneClassName,
  hoverBorderClassName,
}: QuickActionCardProps) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <Link
        href={href}
        className={`card group block min-w-0 p-4 transition-all duration-300 sm:p-5 xl:p-6 ${hoverBorderClassName}`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${toneClassName}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            <p className="truncate text-sm text-foreground-muted">{description}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
