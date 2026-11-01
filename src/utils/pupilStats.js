// Small calculations shared by the pupil screens. All numbers come from the server;
// these only summarise them for display.

export function feeSummary(fees) {
  const total = fees.items.reduce((sum, item) => sum + item.amount, 0);
  const balance = Math.max(0, total - fees.paid);
  let status = 'No fees set';
  if (total > 0) status = balance === 0 ? 'Paid in full' : fees.paid > 0 ? 'Part paid' : 'Unpaid';
  return { total, paid: fees.paid, balance, status };
}

// `percent` is null until the class register has been taken at least once.
export function attendanceSummary({ present, absent, late, schoolDays }) {
  const percent = schoolDays > 0 ? Math.round(((present + late) / schoolDays) * 100) : null;
  return { present, absent, late, schoolDays, percent };
}
