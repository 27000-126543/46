import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}) => {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scaleY: 0, opacity: 0, rotateX: -15 }}
              animate={{ scaleY: 1, opacity: 1, rotateX: 0 }}
              exit={{ scaleY: 0, opacity: 0, rotateX: 15 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
                duration: 0.35,
              }}
              style={{ transformOrigin: 'top center' }}
              className={cn(
                'pointer-events-auto w-full card-parchment border-decorated max-h-[90vh] overflow-hidden flex flex-col',
                sizeClasses[size],
              )}
            >
              {(title || onClose) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-bronze-700/30 flex-shrink-0">
                  {title && (
                    <h2 className="text-xl font-display font-bold text-parchment-50">
                      {title}
                    </h2>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-parchment-400 hover:text-parchment-100 hover:bg-parchment-800/50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">{children}</div>

              {footer && (
                <div className="px-6 py-4 border-t border-bronze-700/30 flex-shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
