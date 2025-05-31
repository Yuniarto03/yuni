import { Shapes } from 'lucide-react';
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 px-4 py-3 group">
      <Shapes className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
      <span className="font-headline text-2xl font-bold text-primary-foreground group-hover:text-primary">
        InsightFlow
      </span>
    </Link>
  );
}
