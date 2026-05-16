'use client';
// src/components/ThemeRegistry.tsx
// MUI requires a specific setup for Next.js App Router to prevent hydration issues.

import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import Box from '@mui/material/Box';
import { theme } from '@/lib/theme';
import Navbar from './Navbar';

function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createEmotionCache();
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Navbar />
        <Box
          component="main"
          sx={{
            minHeight: '100vh',
            backgroundColor: 'background.default',
            pt: { xs: 8, sm: 9 },
          }}
        >
          {children}
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}
