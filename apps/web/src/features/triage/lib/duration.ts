/** "45 min", "1 hr 5 min", "2 days 3 hr"; under a minute reads "Under 1 min". */
export function formatMinutes(minutes: number) {
  const total = Math.round(minutes);
  if (total < 1) return 'Under 1 min';
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const mins = total % 60;
  if (days) {
    return [`${days} ${days === 1 ? 'day' : 'days'}`, hours && `${hours} hr`]
      .filter(Boolean)
      .join(' ');
  }
  return [hours && `${hours} hr`, mins && `${mins} min`]
    .filter(Boolean)
    .join(' ');
}
