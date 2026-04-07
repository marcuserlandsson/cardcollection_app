export function formatPrice(value: number | null): string {
  if (value === null) return "Price not available";
  return `€${value.toFixed(2)}`;
}

export function getCardImageUrl(cardNumber: string): string {
  const base = cardNumber.replace(/-V\d+$/, "");
  return `https://images.digimoncard.io/images/cards/${base}.jpg`;
}

export function getBaseCardNumber(cardNumber: string): string {
  return cardNumber.replace(/-V\d+$/, "");
}

export function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
