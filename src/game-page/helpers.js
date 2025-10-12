export const formatCurrency = (amount) => {
  const isNegative = amount < 0;
  const formattedAmount = Math.abs(amount).toLocaleString();

  return `${isNegative ? '-' : ''}$${formattedAmount}`;
};

export const formatTime = (time) => {
  if (!time) return '';
  const [hour, minute, period] = time;
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
};
