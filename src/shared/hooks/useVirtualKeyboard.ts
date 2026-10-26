import { useState, useEffect } from 'react';

/**
 * Hook untuk mendeteksi software keyboard di mobile (iOS/Android).
 * Menggunakan visualViewport API dengan fallback window.innerHeight.
 */
export function useVirtualKeyboard() {
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkKeyboard = () => {
            if (window.visualViewport) {
                // Keyboard terbuka jika visualViewport menyusut > 20% dari innerHeight
                const isKb = window.visualViewport.height < window.innerHeight * 0.8;
                setIsKeyboardOpen(isKb);
            } else {
                // Fallback untuk browser lawas tanpa visualViewport
                setIsKeyboardOpen(window.innerHeight < 520);
            }
        };

        const viewport = window.visualViewport;
        if (viewport) {
            viewport.addEventListener('resize', checkKeyboard);
            viewport.addEventListener('scroll', checkKeyboard);
        } else {
            window.addEventListener('resize', checkKeyboard);
        }

        // Listener global untuk auto-scroll elemen input ke tengah viewport saat fokus
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        };

        document.addEventListener('focusin', handleFocusIn);

        return () => {
            if (viewport) {
                viewport.removeEventListener('resize', checkKeyboard);
                viewport.removeEventListener('scroll', checkKeyboard);
            } else {
                window.removeEventListener('resize', checkKeyboard);
            }
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, []);

    return isKeyboardOpen;
}
