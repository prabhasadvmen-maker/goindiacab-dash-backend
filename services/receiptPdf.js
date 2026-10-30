// Booking receipt as a PDF, written by hand so the backend needs no extra package.
// One A4 page, standard Helvetica (so the rupee sign is printed as "Rs."). Coordinates below are measured from the TOP-left.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 44;

const NAVY = '#0B2A5B';
const ORANGE = '#FF6600';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const SOFT = '#F3F6FB';
const GREEN = '#15803D';
const AMBER = '#B45309';

const LOGO_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'goindiacab-logo.png');

// Returns { w, h, data } or null (a missing / unsupported logo just falls back to the brand name in text).
const loadLogo = () => {
  try {
    const png = fs.readFileSync(LOGO_FILE);
    if (png.readUInt32BE(0) !== 0x89504e47) return null;
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    if (png[24] !== 8 || png[25] !== 2 || png[28] !== 0) return null; // 8-bit, RGB, not interlaced
    const parts = [];
    for (let pos = 8; pos + 8 <= png.length;) {
      const len = png.readUInt32BE(pos);
      const type = png.toString('latin1', pos + 4, pos + 8);
      if (type === 'IDAT') parts.push(png.subarray(pos + 8, pos + 8 + len));
      if (type === 'IEND') break;
      pos += 12 + len;
    }
    return parts.length ? { w, h, data: Buffer.concat(parts).toString('latin1') } : null;
  } catch {
    return null;
  }
};
const LOGO = loadLogo();

// Helvetica glyph widths (1/1000 em) for ASCII 32..126, regular and bold. Used for wrapping and right alignment.
const REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Standard fonts only cover Latin text, so anything else is replaced or dropped instead of printing garbage.
const clean = (value) =>
  String(value ?? '')
    .replace(/₹/g, 'Rs. ')
    .replace(/[→⇒➜➔]/g, ' to ')
    .replace(/[•·]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(\s*,){2,}/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/^[,\s]+|[,\s]+$/g, '');

const widthOf = (text, size, bold) => {
  const table = bold ? BOLD : REG;
  let w = 0;
  for (const ch of text) w += table[ch.charCodeAt(0) - 32] ?? 556;
  return (w * size) / 1000;
};

const wrap = (text, size, bold, maxWidth) => {
  const words = clean(text).split(' ').filter(Boolean);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (widthOf(next, size, bold) <= maxWidth || !cur) cur = next;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
};

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(' ');
};
const num = (n) => Number(n).toFixed(2);
const escapePdf = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

class Page {
  constructor() { this.ops = []; }
  rect(x, y, w, h, { fill, stroke, width = 0.8 } = {}) {
    if (fill) this.ops.push(`${rgb(fill)} rg`);
    if (stroke) this.ops.push(`${rgb(stroke)} RG ${width} w`);
    this.ops.push(`${num(x)} ${num(PAGE_H - y - h)} ${num(w)} ${num(h)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
  }
  line(x1, y1, x2, y2, { color = LINE, width = 0.8 } = {}) {
    this.ops.push(`${rgb(color)} RG ${width} w ${num(x1)} ${num(PAGE_H - y1)} m ${num(x2)} ${num(PAGE_H - y2)} l S`);
  }
  // y is the text baseline. align 'right' treats x as the right edge.
  text(str, x, y, { size = 10, bold = false, color = INK, align = 'left' } = {}) {
    const t = clean(str);
    if (!t) return;
    const left = align === 'right' ? x - widthOf(t, size, bold) : x;
    this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${num(left)} ${num(PAGE_H - y)} Td (${escapePdf(t)}) Tj ET`);
  }
  // Draws the embedded logo (y measured from the top, like everything else).
  image(x, y, w, h) {
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(PAGE_H - y - h)} cm /Im1 Do Q`);
  }
  content() { return this.ops.join('\n'); }
}

const build = (pages) => {
  // 1 catalog, 2 pages, 3 regular font, 4 bold font, 5 logo image (if any), then (page, content) object pairs.
  const first = LOGO ? 6 : 5;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${first + 2 * i} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  if (LOGO) {
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${LOGO.w} /Height ${LOGO.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${LOGO.w} >> /Length ${LOGO.data.length} >>\nstream\n${LOGO.data}\nendstream`);
  }
  pages.forEach((pg, i) => {
    const stream = pg.content();
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${first + 1 + 2 * i} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${LOGO ? ' /XObject << /Im1 5 0 R >>' : ''} >> >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
  });

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n`; });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
};

// ───────── formatting helpers ─────────
const money = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ymd || '';
};
const timeText = (hm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hm || '');
  if (!m) return hm || '';
  const h = Number(m[1]);
  return `${String(h % 12 || 12).padStart(2, '0')}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};
const stampText = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
const city = (s) => String(s || '').split(',')[0].trim();

const TRIP_LABEL = { oneway: 'One Way', roundtrip: 'Round Trip', local: 'Hourly Rental', airport: 'Airport Transfer' };

export const receiptFileName = (booking) => `GoIndiaCab-Receipt-${booking.bookingId}.pdf`;

export const buildReceiptPdf = (booking, { brand = 'GoIndiaCab', supportPhone = '', supportEmail = '' } = {}) => {
  const { passenger, trip, vehicle, fare, payment } = booking;
  const cash = fare.paymentOption === 'cash';
  const paid = payment?.status === 'paid';
  const pages = [new Page()];
  let page = pages[0];
  const right = PAGE_W - MARGIN;
  const inner = right - MARGIN;
  const LIMIT = PAGE_H - 92; // keep the footer clear
  let y = 0;

  // header band
  page.rect(0, 0, PAGE_W, 80, { fill: NAVY });
  page.rect(0, 80, PAGE_W, 4, { fill: ORANGE });
  if (LOGO) {
    const lh = 34;
    const lw = (lh * LOGO.w) / LOGO.h;
    page.rect(MARGIN, 16, lw + 16, 48, { fill: '#FFFFFF' });
    page.image(MARGIN + 8, 23, lw, lh);
  } else {
    page.text(brand, MARGIN, 45, { size: 25, bold: true, color: '#FFFFFF' });
    page.text('Make your trip easy', MARGIN, 62, { size: 9, color: '#BFD2F2' });
  }
  page.text('BOOKING RECEIPT', right, 33, { size: 10, bold: true, color: '#FFB380', align: 'right' });
  page.text(booking.bookingId, right, 52, { size: 17, bold: true, color: '#FFFFFF', align: 'right' });
  page.text(`Booked on ${stampText(booking.createdAt)}`, right, 67, { size: 8.5, color: '#BFD2F2', align: 'right' });

  y = 112;

  // status chip
  const status = cash ? 'Booking confirmed - pay the driver' : paid ? 'Booking confirmed - payment received' : 'Booking confirmed - payment pending';
  const chipColor = cash ? AMBER : paid ? GREEN : AMBER;
  page.rect(MARGIN, y - 14, widthOf(status, 10, true) + 24, 24, { fill: SOFT, stroke: LINE });
  page.rect(MARGIN, y - 14, 4, 24, { fill: chipColor });
  page.text(status, MARGIN + 14, y + 2, { size: 10, bold: true, color: chipColor });
  y += 30;

  // A new page repeats a slim header so a continued receipt is still identifiable.
  const newPage = () => {
    page = new Page();
    pages.push(page);
    page.rect(0, 0, PAGE_W, 46, { fill: NAVY });
    page.rect(0, 46, PAGE_W, 3, { fill: ORANGE });
    if (LOGO) {
      const lh = 22;
      const lw = (lh * LOGO.w) / LOGO.h;
      page.rect(MARGIN, 7, lw + 12, 32, { fill: '#FFFFFF' });
      page.image(MARGIN + 6, 12, lw, lh);
    } else {
      page.text(brand, MARGIN, 30, { size: 16, bold: true, color: '#FFFFFF' });
    }
    page.text(`Receipt ${booking.bookingId} (continued)`, right, 30, { size: 10, bold: true, color: '#BFD2F2', align: 'right' });
    y = 82;
  };
  const ensure = (height) => { if (y + height > LIMIT) newPage(); };

  const section = (title) => {
    ensure(60);
    page.text(title.toUpperCase(), MARGIN, y, { size: 9, bold: true, color: ORANGE });
    page.line(MARGIN, y + 6, right, y + 6);
    y += 20;
  };
  const kv = (label, value, opts = {}) => {
    const lines = wrap(value, 10, !!opts.bold, inner - 150);
    ensure(lines.length * 12.5 + 8);
    page.text(label, MARGIN, y, { size: 9.5, color: MUTED });
    lines.forEach((ln, i) => page.text(ln, MARGIN + 150, y + i * 12.5, { size: 10, bold: !!opts.bold, color: opts.color || INK }));
    y += Math.max(1, lines.length) * 12.5 + 3.5;
  };

  section('Trip details');
  const isLocal = trip.tripType === 'local';
  const typeLabel = trip.tripType === 'airport' && trip.airportDir ? (trip.airportDir === 'from' ? 'Airport Pickup' : 'Airport Drop') : TRIP_LABEL[trip.tripType] || trip.tripType;
  kv('Trip type', typeLabel);
  kv('Pickup', trip.from);
  if (trip.stop) kv('Stop on the way', trip.stop);
  if (!isLocal && trip.to) kv('Drop', trip.to);
  if (isLocal && trip.package) kv('Package', trip.package);
  kv('Pickup date & time', `${dateText(trip.date)}, ${timeText(trip.time)}`);
  if (trip.tripType === 'roundtrip' && trip.returnDate) kv('Return date', `${dateText(trip.returnDate)} (${trip.days || 1} day${trip.days > 1 ? 's' : ''})`);
  if (!isLocal && trip.distanceKm > 0) kv('Distance', `${trip.distanceKm} km${trip.tripType === 'roundtrip' ? ' each way' : ''}`);
  y += 2;

  section('Cab');
  kv('Vehicle', [vehicle.name, vehicle.model && vehicle.model !== vehicle.name ? `(${vehicle.model})` : ''].filter(Boolean).join(' '));
  if (vehicle.seats) kv('Seats', String(vehicle.seats));
  y += 2;

  section('Passenger');
  kv('Name', passenger.name);
  kv('Mobile', `+91 ${passenger.mobile}`);
  if (passenger.email) kv('Email', passenger.email);
  kv('Pickup address', passenger.pickupAddress);
  if (passenger.dropAddress) kv('Drop address', passenger.dropAddress);
  y += 2;

  section('Fare summary');
  const row = (label, value, opts = {}) => {
    ensure(24);
    page.text(label, MARGIN, y, { size: 10, color: opts.color || INK, bold: !!opts.bold });
    page.text(value, right, y, { size: 10, color: opts.color || INK, bold: !!opts.bold, align: 'right' });
    y += 15;
  };
  row('Base fare', money(fare.baseFare));
  if (fare.extraKmFare > 0) row('Extra km charges', money(fare.extraKmFare));
  if (fare.driverAllowance > 0) row('Driver allowance', money(fare.driverAllowance));
  for (const a of (fare.addons || []).filter((x) => x && Number(x.price) > 0)) row(a.label || 'Add-on', money(a.price));
  if (fare.gst > 0) row('GST', money(fare.gst));
  if (fare.discount > 0) row(`Coupon discount${fare.couponCode ? ` (${fare.couponCode})` : ''}`, `- ${money(fare.discount)}`, { color: GREEN, bold: true });

  // totals box
  y += 2;
  const boxH = cash ? 54 : 74;
  ensure(boxH + 40);
  page.rect(MARGIN, y, inner, boxH, { fill: SOFT, stroke: LINE });
  let by = y + 22;
  const boxRow = (label, value, color = INK, bold = true) => {
    page.text(label, MARGIN + 14, by, { size: 10.5, bold, color });
    page.text(value, right - 14, by, { size: 10.5, bold, color, align: 'right' });
    by += 20;
  };
  boxRow('Total fare', money(fare.total), INK);
  if (!cash) boxRow(paid ? 'Paid online' : 'Due now (online)', money(payment?.paidAmount || fare.paidNow), paid ? GREEN : AMBER);
  boxRow(cash ? 'To pay to the driver' : 'Balance to pay to the driver', money(fare.payLater), ORANGE);
  y += boxH + 18;

  section('Payment');
  kv('Status', cash ? 'Pay to driver' : paid ? 'Paid' : 'Pending', { bold: true, color: cash ? AMBER : paid ? GREEN : AMBER });
  kv('Method', cash ? 'Cash / UPI to the driver after the ride' : 'Online (Razorpay)');
  kv('Payment option', cash ? 'Pay to driver' : fare.paymentOption === 'full' ? 'Full payment' : 'Part payment');
  if (paid && payment.paidAt) kv('Paid on', stampText(payment.paidAt));
  if (paid && payment.paymentId) kv('Payment ID', payment.paymentId);

  // footer on every page
  const help = ['Need help?', supportPhone && `Call ${supportPhone}`, supportEmail].filter(Boolean).join('  |  ');
  const note = `This is a system generated receipt from ${brand}. Please keep your Booking ID handy for any queries.`;
  pages.forEach((pg, i) => {
    const fy = PAGE_H - 52;
    pg.line(MARGIN, fy - 14, right, fy - 14);
    pg.text(help, PAGE_W / 2 - widthOf(clean(help), 9, false) / 2, fy, { size: 9, color: MUTED });
    pg.text(note, PAGE_W / 2 - widthOf(clean(note), 8, false) / 2, fy + 14, { size: 8, color: MUTED });
    if (pages.length > 1) pg.text(`Page ${i + 1} of ${pages.length}`, right, fy + 30, { size: 8, color: MUTED, align: 'right' });
  });

  return build(pages);
};
