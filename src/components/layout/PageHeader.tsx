import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs
}: PageHeaderProps) {
  return (
    <div className="relative mb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-4 text-sm">
          <Link
            to="/"
            className="flex items-center gap-1 text-parchment-400 hover:text-bronze-300 transition-colors duration-200"
          >
            <Home size={14} />
            <span>首页</span>
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <ChevronRight size={14} className="text-parchment-600" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-parchment-400 hover:text-bronze-300 transition-colors duration-200"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-parchment-200 font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-bronze-emboss flex items-center justify-center shadow-bronze-emboss border border-bronze-400/30 text-2xl">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide bg-gold-shimmer bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-parchment-300 font-body text-base sm:text-lg max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      <div className="mt-6 relative h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-bronze-500/60 to-transparent" />
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-bronze-400',
            'left-1/4 shadow-[0_0_8px_rgba(212,175,55,0.6)]'
          )}
        />
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-bronze-400',
            'right-1/4 shadow-[0_0_8px_rgba(212,175,55,0.6)]'
          )}
        />
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-bronze-300',
            'shadow-[0_0_12px_rgba(212,175,55,0.8)]'
          )}
        />
      </div>
    </div>
  );
}
