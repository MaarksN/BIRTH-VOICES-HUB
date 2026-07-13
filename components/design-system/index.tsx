import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertTriangle, AlertCircle, Info, CheckCircle, X, ChevronDown, RefreshCw, ChevronRight } from 'lucide-react';

// ============================================================================
// 1. BUTTON COMPONENT
// ============================================================================
interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick" | "className" | "disabled" | "type"> {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 dark:focus:ring-offset-slate-900";
  
  const variants = {
    primary: "bg-brand text-white hover:opacity-95 shadow-sm hover:shadow-md",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm dark:bg-red-700 dark:hover:bg-red-800",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-sm dark:bg-green-700 dark:hover:bg-green-800"
  };

  const sizes = {
    xs: "px-2.5 py-1 text-xs",
    sm: "px-3.5 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
      ) : leftIcon ? (
        <span className="mr-2 flex items-center justify-center">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && (
        <span className="ml-2 flex items-center justify-center">{rightIcon}</span>
      )}
    </button>
  );
}

// ============================================================================
// 2. INPUT & TEXTAREA COMPONENTS
// ============================================================================
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder" | "value" | "onChange" | "className"> {
  placeholder?: string;
  value?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-brand ${
          error ? 'border-red-350 focus:ring-red-500 dark:border-red-550' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-650 dark:text-red-400 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
}

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={`w-full p-3.5 border rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all shadow-xs dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:focus:ring-brand ${
          error ? 'border-red-350 focus:ring-red-500 dark:border-red-550' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-650 dark:text-red-400 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
}

// ============================================================================
// 3. CHECKBOX & SWITCH
// ============================================================================
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "className"> {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  label: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`flex items-start gap-2.5 cursor-pointer select-none text-left ${className}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 text-brand rounded border-slate-300 focus:ring-brand accent-brand transition-all dark:border-slate-700 dark:bg-slate-800"
        {...props}
      />
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight">{label}</span>
    </label>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 cursor-pointer select-none text-left" onClick={() => onChange(!checked)}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>}
          {description && <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>}
        </div>
      )}
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-100 shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}

// ============================================================================
// 4. SELECT COMPONENT
// ============================================================================
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "className"> {
  value?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all shadow-xs appearance-none dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 ${
            error ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-650 dark:text-red-400 font-medium">{error}</p>}
    </div>
  );
}

// ============================================================================
// 5. BADGE COMPONENT
// ============================================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const styles = {
    primary: "bg-brand-50 text-brand border-brand-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40",
    secondary: "bg-slate-100 text-slate-750 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    success: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/40",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40",
    danger: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40"
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ============================================================================
// 6. CARD COMPONENT
// ============================================================================
interface CardProps {
  key?: React.Key;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition-all duration-200 ${
        onClick || hoverable ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 7. SKELETON LOADER
// ============================================================================
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-md ${className}`} />
  );
}

// ============================================================================
// 8. EMPTY STATE COMPONENT
// ============================================================================
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-250 dark:border-slate-700 rounded-xl max-w-lg mx-auto">
      {icon && (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm mb-4 text-slate-400 dark:text-slate-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ============================================================================
// 9. ALERT COMPONENT
// ============================================================================
interface AlertProps {
  title: string;
  description?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info';
}

export function Alert({ title, description, variant = 'info' }: AlertProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    danger: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  };

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-300",
    warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300",
    danger: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-300",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-300"
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl shadow-xs leading-relaxed ${styles[variant]}`}>
      <div className="shrink-0 mt-0.5">{icons[variant]}</div>
      <div className="flex-1 space-y-1">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
        {description && <p className="text-xs text-slate-700 dark:text-slate-300">{description}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// 10. SPINNER (LOADING)
// ============================================================================
export function Spinner({ className = '', size = 'md' }: { className?: string, size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };
  return (
    <div className={`animate-spin rounded-full border-slate-200 border-t-brand dark:border-slate-700 dark:border-t-brand ${sizes[size]} ${className}`} />
  );
}

// ============================================================================
// 11. PROGRESS BAR
// ============================================================================
export function Progress({ value, className = '' }: { value: number, className?: string }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full bg-slate-100 dark:bg-slate-750 rounded-full h-2.5 overflow-hidden ${className}`}>
      <div 
        className="bg-brand h-2.5 rounded-full transition-all duration-350 ease-out" 
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

// ============================================================================
// 12. AVATAR COMPONENT
// ============================================================================
export function Avatar({ name, src, size = 'md', className = '' }: { name: string, src?: string, size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg'
  };

  const getInitials = (n: string) => {
    return n.trim().split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-brand text-white font-bold select-none shadow-xs ${sizes[size]} ${className}`}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(name || 'User')}</span>
      )}
    </div>
  );
}

// ============================================================================
// 13. TABS SYSTEM
// ============================================================================
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: { tabs: Tab[], activeTab: string, onChange: (id: string) => void, className?: string }) {
  return (
    <div className={`flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide gap-1 ${className}`}>
      {tabs.map(tab => {
        const isSelected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all relative whitespace-nowrap outline-none ${
              isSelected 
                ? 'text-brand' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-250'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {isSelected && (
              <motion.div 
                layoutId="active-tab-line"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// 14. BREADCRUMBS
// ============================================================================
interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-450 mb-4 select-none">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-350 dark:text-slate-600" />}
          {item.onClick ? (
            <button 
              onClick={item.onClick}
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-800 dark:text-slate-200 font-bold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ============================================================================
// 15. TABLE COMPONENT
// ============================================================================
export function Table({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`w-full overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 shadow-sm ${className}`}>
      <table className="w-full text-sm text-left border-collapse">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <thead className={`bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-750 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider ${className}`}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className = '', onClick, key }: { children: React.ReactNode, className?: string, onClick?: () => void, key?: React.Key }) {
  return (
    <tr 
      onClick={onClick} 
      className={`border-b last:border-0 border-slate-150 dark:border-slate-750 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', isHeader = false }: { children: React.ReactNode, className?: string, isHeader?: boolean }) {
  if (isHeader) {
    return <th className={`px-6 py-4 font-bold text-slate-600 dark:text-slate-400 ${className}`}>{children}</th>;
  }
  return <td className={`px-6 py-4 text-slate-750 dark:text-slate-300 font-medium ${className}`}>{children}</td>;
}

// ============================================================================
// 16. MODAL & DIALOG
// ============================================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          
          {/* Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full overflow-hidden flex flex-col z-10 animate-scale-in"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-none">{title}</h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] text-left">
              {children}
            </div>

            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/45 border-t border-slate-200 dark:border-slate-700">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// 17. TIMELINE COMPONENT
// ============================================================================
interface TimelineItem {
  title: string;
  description: string;
  time: string;
  icon?: React.ReactNode;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-6 text-left relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-4 relative">
          <div className="h-7 w-7 rounded-full bg-white dark:bg-slate-800 border-2 border-brand text-brand flex items-center justify-center shrink-0 z-10 shadow-xs">
            {item.icon || <Info className="h-3.5 w-3.5" />}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-150">{item.title}</h4>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{item.time}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 18. TOOLTIP
// ============================================================================
export function Tooltip({ text, children }: { text: string, children: React.ReactNode }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-950 text-white text-[10px] font-semibold rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950" />
      </div>
    </div>
  );
}

// ============================================================================
// 19. TOAST MANAGER & CUSTOM CONTEXT
// ============================================================================
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return { toasts, showToast };
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className={`p-4 rounded-xl border shadow-lg flex items-start gap-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 pointer-events-auto ${
              toast.type === 'success' ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20' :
              toast.type === 'error' ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20' : 
              'border-slate-200 bg-white dark:border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-450 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-450 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600 dark:text-blue-450 shrink-0 mt-0.5" />}
            <span className="text-xs font-semibold leading-relaxed flex-1">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
