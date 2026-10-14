import Icon from './Icon';

interface ErrorMessageProps {
  children: string;
  className?: string;
}

export default function ErrorMessage({ children, className = '' }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border border-pitch-green/30 border-l-4 border-l-red-500 bg-red-50 p-3 text-left ${className}`}
    >
      <Icon name="worried" size={32} />
      <p className="min-w-0 break-words text-sm font-medium text-pitch-dark">{children}</p>
    </div>
  );
}
