'use client';
import { useEffect, useState } from 'react';

export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetch('/api/csrf')
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.token ?? ''))
      .catch(() => {});
  }, []);

  return csrfToken;
}

export function csrfHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-csrf-token': token,
  };
}
