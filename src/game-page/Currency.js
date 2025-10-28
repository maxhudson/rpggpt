import { formatCurrency } from './helpers';

export function Currency({ amount }) {
  return (
    <span>
      {formatCurrency(amount)}
    </span>
  );
}
