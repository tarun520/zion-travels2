const nodemailer = require('nodemailer');

function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!isMailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatMoney(amountInr) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountInr || 0);
}

function buildReceiptHtml(booking) {
  const total = booking.totalAmountInr ?? booking.amountInr ?? 0;
  const advance = booking.advanceAmountInr ?? total;
  const remaining = booking.remainingAmountInr ?? 0;

  return `
  <div style="font-family: Arial, Helvetica, sans-serif; color: #111; max-width: 560px; margin: 0 auto;">
    <h2 style="margin-bottom: 4px;">Zion Travels — Booking Receipt</h2>
    <p style="color:#555;margin-top:0;">Thank you. Your booking is confirmed. Advance paid online; balance due offline.</p>
    <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
      <tr><td style="padding:8px 0;color:#666;">Booking ID</td><td style="padding:8px 0;text-align:right;"><strong>${booking.id}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#666;">Customer</td><td style="padding:8px 0;text-align:right;">${booking.customerName}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Car</td><td style="padding:8px 0;text-align:right;">${booking.carName}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Dates</td><td style="padding:8px 0;text-align:right;">${booking.startDate} → ${booking.endDate}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Duration</td><td style="padding:8px 0;text-align:right;">${booking.days} day(s)</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Rate</td><td style="padding:8px 0;text-align:right;">${formatMoney(booking.pricePerUnit)} / ${booking.priceUnit}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Total fare</td><td style="padding:8px 0;text-align:right;">${formatMoney(total)}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Advance paid online</td><td style="padding:8px 0;text-align:right;"><strong>${formatMoney(advance)}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#666;">Balance (pay offline)</td><td style="padding:8px 0;text-align:right;"><strong>${formatMoney(remaining)}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#666;border-top:1px solid #eee;">Payment ID</td><td style="padding:8px 0;text-align:right;border-top:1px solid #eee;">${booking.razorpayPaymentId || 'N/A'}</td></tr>
    </table>
    <p style="margin-top:24px;color:#777;font-size:13px;">Please pay the remaining balance in cash/UPI at pickup or drop-off. Contact Zion Travels support for help.</p>
  </div>
  `;
}

async function sendBookingReceipt(booking) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('Receipt email skipped: SMTP is not configured');
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const total = booking.totalAmountInr ?? booking.amountInr ?? 0;
  const advance = booking.advanceAmountInr ?? total;
  const remaining = booking.remainingAmountInr ?? 0;
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const info = await transporter.sendMail({
    from: `"Zion Travels" <${from}>`,
    to: booking.customerEmail,
    subject: `Booking receipt — ${booking.carName} (#${booking.id.slice(0, 8)})`,
    text: [
      'Zion Travels — Booking Receipt',
      '',
      `Hi ${booking.customerName},`,
      'Thank you. Your booking is confirmed.',
      '',
      `Booking ID: ${booking.id}`,
      `Car: ${booking.carName}`,
      `Dates: ${booking.startDate} to ${booking.endDate}`,
      `Duration: ${booking.days} day(s)`,
      `Total fare: ${formatMoney(total)}`,
      `Advance paid online: ${formatMoney(advance)}`,
      `Balance (pay offline): ${formatMoney(remaining)}`,
      `Payment ID: ${booking.razorpayPaymentId || 'N/A'}`,
    ].join('\n'),
    html: buildReceiptHtml(booking),
  });

  return { sent: true, messageId: info.messageId };
}

module.exports = {
  isMailConfigured,
  sendBookingReceipt,
};
