'use client';
// Achica una foto en el navegador (lado mayor = max px, WebP) antes de subirla, así la web carga rápido.
export async function shrinkPhoto(file, max = 1600, q = 0.84) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((r) => c.toBlob(r, 'image/webp', q));
}

// Sube la foto a la carpeta pública "menu" y devuelve su dirección.
export async function uploadPhoto(sb, blob, folder) {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const up = await sb.storage.from('menu').upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (up.error) throw up.error;
  return sb.storage.from('menu').getPublicUrl(path).data.publicUrl;
}
