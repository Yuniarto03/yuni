import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center gap-3 mb-1">
        {Icon && <Icon className="h-8 w-8 text-primary" />}
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary-foreground">{title}</h1>
      </div>
      {description && <p className="text-lg text-muted-foreground">{description}</p>}
    </div>
  );
}
