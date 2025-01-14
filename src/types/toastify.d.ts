declare module 'toastify-js' {
    interface ToastifyOptions {
        text: string;
        duration?: number;
        gravity?: 'top' | 'bottom';
        position?: 'left' | 'center' | 'right';
        backgroundColor?: string;
        stopOnFocus?: boolean;
        className?: string;
        offset?: object;
        onClick?: () => void;
    }

    interface Toastify {
        showToast(): void;
    }

    function toastify(options: ToastifyOptions): Toastify;
    export = toastify;
} 