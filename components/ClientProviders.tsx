'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 30, // 30 menit
        refetchOnWindowFocus: false,
      },
    },
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const selector = 'section, .glass, .max-w-7xl > *';
    const nodes = Array.from(document.querySelectorAll(selector));
    nodes.forEach((el, idx) => {
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${idx * 60}ms`);
    });

    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          el.classList.add('in');
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.12 });

    nodes.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}