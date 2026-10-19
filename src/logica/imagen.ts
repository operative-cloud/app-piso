/** Reduce una foto de ticket a JPEG ligero (< ~90 KB) para que quepa cifrada en el relay. */
export async function comprimirFoto(archivo: File, maxLado = 900, maxBytes = 90_000): Promise<string> {
  const bmp = await createImageBitmap(archivo)
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(bmp.width * escala)
  lienzo.height = Math.round(bmp.height * escala)
  lienzo.getContext('2d')!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height)
  let calidad = 0.7
  let url = lienzo.toDataURL('image/jpeg', calidad)
  while (url.length > maxBytes && calidad > 0.25) {
    calidad -= 0.1
    url = lienzo.toDataURL('image/jpeg', calidad)
  }
  return url
}
