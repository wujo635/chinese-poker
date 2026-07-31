import './ValidationStatus.css';

const FOUL_MESSAGES: Record<string, string> = {
  'back-must-beat-middle': 'Back hand must be stronger than your middle hand.',
  'middle-must-beat-front': 'Middle hand must be stronger than your front hand.',
};

interface ValidationStatusProps {
  status: 'incomplete' | 'valid' | 'invalid';
  foulReason?: string | null;
}

export function ValidationStatus({ status, foulReason }: ValidationStatusProps) {
  if (status === 'incomplete') {
    return (
      <div className="validation-status validation-status--incomplete">
        Place all 13 cards to check your arrangement.
      </div>
    );
  }

  if (status === 'valid') {
    return <div className="validation-status validation-status--valid">✓ Valid arrangement</div>;
  }

  return (
    <div className="validation-status validation-status--invalid">
      ✗ Foul{foulReason ? `: ${FOUL_MESSAGES[foulReason] ?? foulReason}` : ''}
    </div>
  );
}
