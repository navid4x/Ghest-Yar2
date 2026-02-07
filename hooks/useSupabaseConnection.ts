// hooks/useSupabaseConnection.ts
'use client';
import { useState, useEffect } from 'react';

export function useSupabaseConnection() {
    const [isReachable, setIsReachable] = useState(navigator.onLine); // مقدار اولیه بر اساس navigator

    const checkConnection = async () => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseUrl) {
            console.warn('Supabase URL تعریف نشده است');
            setIsReachable(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            setIsReachable(response.status >= 200 && response.status < 500);
        } catch (error: any) {
            console.log('اتصال به Supabase چک نشد:', error?.name || error?.message || error);
            setIsReachable(false);
        } finally {
            clearTimeout(timeoutId);
        }
    };

    useEffect(() => {
        checkConnection(); // چک اولیه

        // چک دوره‌ای هر ۳۰ ثانیه (اختیاری، اما مفید)
        const interval = setInterval(checkConnection, 30000);

        // گوش دادن به تغییرات شبکه
        const handleOnline = () => checkConnection();
        const handleOffline = () => setIsReachable(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isReachable;
}