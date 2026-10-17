import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === 'true',
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatAppointmentDate(value) {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

function formatAppointmentTime(value) {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export async function sendBookingConfirmation({ id, customerName, customerEmail, branchName, branchAddress, departmentName, startsAt, endsAt }) {
  const name = escapeHtml(customerName);
  const reference = escapeHtml(id);
  const escapedBranchName = escapeHtml(branchName);
  const escapedBranchAddress = escapeHtml(branchAddress);
  const escapedDepartmentName = escapeHtml(departmentName);
  const date = formatAppointmentDate(startsAt);
  const startTime = formatAppointmentTime(startsAt);
  const endTime = formatAppointmentTime(endsAt);
  const appointmentDetails = `Branch: ${branchName}\nAddress: ${branchAddress}\nDepartment: ${departmentName}\nDate: ${date}\nTime: ${startTime}–${endTime} (South African time)`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Branch Appointments <appointments@example.local>',
    to: customerEmail,
    subject: 'Your branch appointment is confirmed',
    text: `Hello ${customerName},\n\nYour appointment is confirmed.\nBooking reference: ${id}\n${appointmentDetails}\n\nWe look forward to seeing you.`,
    html: `<p>Hello ${name},</p><p>Your appointment is confirmed.</p><p>Booking reference: <strong>${reference}</strong></p><p><strong>${escapedBranchName}</strong><br>${escapedBranchAddress}<br>Department: ${escapedDepartmentName}<br>${date}<br>${startTime}–${endTime} (South African time)</p><p>We look forward to seeing you.</p>`,
  });
}
