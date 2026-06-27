import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; // ✅ NEW: More sizes
  closeOnOutsideClick?: boolean; // ✅ NEW: Control outside click
  closeOnEscape?: boolean; // ✅ NEW: Control escape key
  showCloseButton?: boolean; // ✅ NEW: Show/hide close button
  className?: string; // ✅ NEW: Custom className
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  closeOnOutsideClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // ✅ Close on Escape
  useEffect(() => {
    if (!closeOnEscape) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, closeOnEscape]);

  // ✅ Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ✅ Close on outside click
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[95vw]',
  };

  // ✅ Mobile responsive: full width on small screens
  const mobileSizeClass = 'w-[95vw] sm:w-full';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={handleOutsideClick}
    >
      {/* backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={closeOnOutsideClick ? onClose : undefined}
      ></div>

      {/* modal */}
      <div 
        ref={modalRef}
        className={`
          relative 
          bg-white dark:bg-gray-800 
          rounded-2xl shadow-2xl 
          ${mobileSizeClass} ${sizeClasses[size]} 
          max-h-[95vh] 
          flex flex-col 
          transition-all duration-200 
          animate-in fade-in zoom-in-95
          ${className}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl z-10">
            {title && (
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-white truncate">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`
                  p-1.5 sm:p-2 -mr-1.5 sm:-mr-2 
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 
                  rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                  transition-colors 
                  text-2xl leading-none
                  focus:outline-none focus:ring-2 focus:ring-gray-400
                `}
                aria-label="Close modal"
              >
                &times;
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;