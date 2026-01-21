import { useEffect } from 'react';

/**
 * Professional Modal Component for SITAG
 *
 * Features:
 * - Semi-transparent backdrop with blur effect
 * - Smooth fade + subtle scale entry animation
 * - Controlled closing (no outside click, no Escape key)
 * - Proper scroll handling with rounded corner clipping
 * - Fixed header/footer with scrollable body
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal should close (via X or Cancel)
 * @param {string} title - Modal title text
 * @param {React.ReactNode} children - Modal body content
 * @param {React.ReactNode} footer - Modal footer content (buttons)
 * @param {string} maxWidth - Max width class (default: 'max-w-4xl')
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-4xl'
}) {
  // Prevent modal from closing on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  // Prevent body scroll when modal is open
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

  if (!isOpen) return null;

  // Prevent clicks on modal container from bubbling to backdrop
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-overlay" aria-hidden="true" />

      <div className={`modal-container ${maxWidth}`} onClick={handleModalClick}>
        {/* Header - Fixed */}
        <div className="modal-header">
          <h2 className="text-2xl font-display font-bold" style={{ color: '#3FA79F' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            type="button"
            aria-label="Cerrar modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer - Fixed */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        /* Backdrop - Semi-transparent with blur */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
          animation: modalBackdropFadeIn 0.2s ease-out;
        }

        .modal-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        /* Modal Container - Smooth entry animation */
        .modal-container {
          position: relative;
          width: 100%;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          animation: modalFadeInScale 0.25s ease-out;
        }

        /* Header - Fixed at top */
        .modal-header {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #E5E7EB;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 1rem 1rem 0 0;
          z-index: 10;
          flex-shrink: 0;
        }

        /* Body - Scrollable with contained scrollbar */
        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          min-height: 0;
        }

        /* Footer - Fixed at bottom */
        .modal-footer {
          position: sticky;
          bottom: 0;
          background: white;
          border-top: 1px solid #E5E7EB;
          padding: 1.5rem;
          border-radius: 0 0 1rem 1rem;
          flex-shrink: 0;
        }

        /* Smooth scrollbar styling */
        .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .modal-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .modal-body::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 4px;
        }

        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }

        /* Animations */
        @keyframes modalBackdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalFadeInScale {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .modal-backdrop {
            padding: 0.5rem;
          }

          .modal-container {
            max-height: 95vh;
          }

          .modal-header,
          .modal-body,
          .modal-footer {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
