import { toast as reactToast, ToastOptions } from 'react-toastify';
import { useCallback } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  options?: ToastOptions;
}

export const useToast = () => {
  const showToast = useCallback(({ message, type = 'info', options = {} }: ToastProps) => {
    const defaultOptions: ToastOptions = {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options
    };
    
    switch (type) {
      case 'success':
        return reactToast.success(message, defaultOptions);
      case 'error':
        return reactToast.error(message, defaultOptions);
      case 'warning':
        return reactToast.warning(message, defaultOptions);
      case 'info':
      default:
        return reactToast.info(message, defaultOptions);
    }
  }, []);

  return {
    showToast,
    success: (message: string, options?: ToastOptions) => 
      showToast({ message, type: 'success', options }),
    error: (message: string, options?: ToastOptions) => 
      showToast({ message, type: 'error', options }),
    warning: (message: string, options?: ToastOptions) => 
      showToast({ message, type: 'warning', options }),
    info: (message: string, options?: ToastOptions) => 
      showToast({ message, type: 'info', options }),
    dismiss: reactToast.dismiss
  };
};

export const toast = {
  success: (message: string, options?: ToastOptions) => 
    reactToast.success(message, options),
  error: (message: string, options?: ToastOptions) => 
    reactToast.error(message, options),
  warning: (message: string, options?: ToastOptions) => 
    reactToast.warning(message, options),
  info: (message: string, options?: ToastOptions) => 
    reactToast.info(message, options),
  dismiss: reactToast.dismiss
}; 