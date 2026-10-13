const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function bs58(buf) {
  const d = [];
  for (const b of buf) {
    let c = b;
    for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; }
    while (c > 0) { d.push(c % 58); c = (c / 58) | 0; }
  }
  let s = "";
  for (const b of buf) { if (b === 0) s += "1"; else break; }
  for (let i = d.length - 1; i >= 0; i--) s += A[d[i]];
  return s;
}
