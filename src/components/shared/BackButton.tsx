import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  label?: string;
}

export default function BackButton({ label = 'Back to Roles' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      className="btn-ghost flex items-center gap-2 text-sm"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}
