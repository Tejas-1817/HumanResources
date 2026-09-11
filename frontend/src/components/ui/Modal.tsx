import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Modal = ({
  open,
  onClose,
  title,
  children,
  className = "",
  bodyClassName = "",
}: ModalProps) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={onClose}
        />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`glass-card p-0 w-full shadow-2xl rounded-2xl border border-border flex flex-col max-h-[88vh] overflow-hidden pointer-events-auto ${
              className || "max-w-lg"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-border/50 shrink-0 bg-card/60 backdrop-blur-xs">
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 ${bodyClassName}`}>
              {children}
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);
