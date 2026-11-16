'use client';

import Swal from 'sweetalert2';

// Custom themed SweetAlert2 helpers matching a modern industrial billing theme
export const SweetAlert = {
  // Error Alert
  error: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'error',
      title: title || 'Error',
      text: text || 'An unexpected error occurred. Please check your inputs.',
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'OK',
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-red-100',
        title: 'text-lg font-bold text-gray-900',
        confirmButton: 'px-5 py-2.5 rounded-lg text-sm font-semibold'
      }
    });
  },

  // Success Alert
  success: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'success',
      title: title || 'Success!',
      text: text || 'Action completed successfully.',
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Continue',
      timer: 3500,
      timerProgressBar: true,
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-emerald-100',
        title: 'text-lg font-bold text-gray-900',
        confirmButton: 'px-5 py-2.5 rounded-lg text-sm font-semibold'
      }
    });
  },

  // Warning Alert
  warning: (title: string, text?: string) => {
    return Swal.fire({
      icon: 'warning',
      title: title || 'Warning',
      text: text || 'Please verify the details before proceeding.',
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Understood',
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-amber-100',
        title: 'text-lg font-bold text-gray-900',
        confirmButton: 'px-5 py-2.5 rounded-lg text-sm font-semibold'
      }
    });
  },

  // Confirmation Dialog
  confirm: async (title: string, text?: string, confirmText: string = 'Yes, Proceed') => {
    const result = await Swal.fire({
      icon: 'question',
      title: title || 'Are you sure?',
      text: text || 'This action cannot be easily undone.',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-xl shadow-2xl border border-gray-100',
        title: 'text-lg font-bold text-gray-900',
        confirmButton: 'px-5 py-2.5 rounded-lg text-sm font-semibold',
        cancelButton: 'px-5 py-2.5 rounded-lg text-sm font-semibold'
      }
    });
    return result.isConfirmed;
  },

  // Fast Toast Alert
  toast: (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    return Toast.fire({
      icon: icon,
      title: title
    });
  }
};
