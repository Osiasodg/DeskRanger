// Icônes « réelles » de Windows, identiques à l'Explorateur : on interroge la liste
// d'images système (SHGetFileInfo + SHGetImageList) au lieu d'app.getFileIcon, qui
// renvoie une page blanche pour les raccourcis .lnk et une icône de disque pour les dossiers.
const { nativeImage } = require('electron');

let api = null;

if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    const shell32 = koffi.load('shell32.dll');
    const user32 = koffi.load('user32.dll');
    const gdi32 = koffi.load('gdi32.dll');

    const GUID = koffi.struct('ZonesGUID', {
      Data1: 'uint32_t', Data2: 'uint16_t', Data3: 'uint16_t', Data4: koffi.array('uint8_t', 8),
    });
    const SHFILEINFOW = koffi.struct('ZonesSHFILEINFOW', {
      hIcon: 'intptr_t',
      iIcon: 'int',
      dwAttributes: 'uint32_t',
      szDisplayName: koffi.array('uint16_t', 260),
      szTypeName: koffi.array('uint16_t', 80),
    });
    const BITMAPINFO = koffi.struct('ZonesBITMAPINFO', {
      biSize: 'uint32_t', biWidth: 'int32_t', biHeight: 'int32_t', biPlanes: 'uint16_t', biBitCount: 'uint16_t',
      biCompression: 'uint32_t', biSizeImage: 'uint32_t', biXPelsPerMeter: 'int32_t', biYPelsPerMeter: 'int32_t',
      biClrUsed: 'uint32_t', biClrImportant: 'uint32_t', bmiColors: koffi.array('uint8_t', 4),
    });
    const GetIconProto = koffi.proto('__stdcall', 'ZonesImageListGetIcon', 'int32_t',
      ['void *', 'int', 'uint32_t', koffi.out(koffi.pointer('intptr_t'))]);

    api = {
      koffi,
      GUID,
      SHFILEINFOW,
      BITMAPINFO,
      GetIconProto,
      SHGetFileInfoW: shell32.func('__stdcall', 'SHGetFileInfoW', 'uintptr_t',
        ['str16', 'uint32_t', koffi.out(koffi.pointer(SHFILEINFOW)), 'uint32_t', 'uint32_t']),
      SHGetImageList: shell32.func('__stdcall', 'SHGetImageList', 'int32_t',
        ['int', koffi.pointer(GUID), koffi.out(koffi.pointer('void *'))]),
      DrawIconEx: user32.func('__stdcall', 'DrawIconEx', 'int',
        ['intptr_t', 'int', 'int', 'intptr_t', 'int', 'int', 'uint32_t', 'intptr_t', 'uint32_t']),
      DestroyIcon: user32.func('__stdcall', 'DestroyIcon', 'int', ['intptr_t']),
      CreateCompatibleDC: gdi32.func('__stdcall', 'CreateCompatibleDC', 'intptr_t', ['intptr_t']),
      DeleteDC: gdi32.func('__stdcall', 'DeleteDC', 'int', ['intptr_t']),
      CreateDIBSection: gdi32.func('__stdcall', 'CreateDIBSection', 'intptr_t',
        ['intptr_t', koffi.pointer(BITMAPINFO), 'uint32_t', koffi.out(koffi.pointer('void *')), 'intptr_t', 'uint32_t']),
      SelectObject: gdi32.func('__stdcall', 'SelectObject', 'intptr_t', ['intptr_t', 'intptr_t']),
      DeleteObject: gdi32.func('__stdcall', 'DeleteObject', 'int', ['intptr_t']),
      PatBlt: gdi32.func('__stdcall', 'PatBlt', 'int', ['intptr_t', 'int', 'int', 'int', 'int', 'uint32_t']),
      GetDIBits: gdi32.func('__stdcall', 'GetDIBits', 'int',
        ['intptr_t', 'intptr_t', 'uint32_t', 'uint32_t', 'void *', koffi.inout(koffi.pointer(BITMAPINFO)), 'uint32_t']),
    };
  } catch (err) {
    console.warn('[zones] icônes système indisponibles :', err.message);
    api = null;
  }
}

const SHGFI_SYSICONINDEX = 0x4000;
const SHIL_EXTRALARGE = 2; // 48 × 48
const SHIL_JUMBO = 4;      // 256 × 256
const ILD_TRANSPARENT = 0x1;
const DI_NORMAL = 0x3;
const WHITENESS = 0x00ff0062;
const BLACKNESS = 0x00000042;
const IMAGE_LIST_GET_ICON = 10; // rang de IImageList::GetIcon dans la vtable
// IID_IImageList {46EB5926-582E-4017-9FDF-E8998DAA0950}
const IID_IImageList = {
  Data1: 0x46eb5926, Data2: 0x582e, Data3: 0x4017,
  Data4: [0x9f, 0xdf, 0xe8, 0x99, 0x8d, 0xaa, 0x09, 0x50],
};

const imageLists = new Map();

function imageList(kind) {
  if (!imageLists.has(kind)) {
    const out = [null];
    const hr = api.SHGetImageList(kind, IID_IImageList, out);
    imageLists.set(kind, hr === 0 ? out[0] : null);
  }
  return imageLists.get(kind);
}

function iconFromList(kind, index) {
  const list = imageList(kind);
  if (!list) return 0;
  const { koffi } = api;
  const vtable = koffi.decode(list, 'void *');
  const getIcon = koffi.decode(vtable, IMAGE_LIST_GET_ICON * koffi.sizeof('void *'), 'void *');
  const out = [0];
  const hr = koffi.call(getIcon, api.GetIconProto, list, index, ILD_TRANSPARENT, out);
  return hr === 0 ? out[0] : 0;
}

function bitmapHeader(size) {
  return {
    biSize: 40, biWidth: size, biHeight: -size, biPlanes: 1, biBitCount: 32, biCompression: 0,
    biSizeImage: 0, biXPelsPerMeter: 0, biYPelsPerMeter: 0, biClrUsed: 0, biClrImportant: 0,
    bmiColors: [0, 0, 0, 0],
  };
}

// L'icône est dessinée sur fond noir puis sur fond blanc : la différence donne la
// transparence exacte, quel que soit le format de l'icône (alpha 32 bits ou masque).
function renderIcon(hicon, size) {
  const dc = api.CreateCompatibleDC(0);
  const bits = [null];
  const hbm = api.CreateDIBSection(dc, bitmapHeader(size), 0, bits, 0, 0);
  const grab = (rop) => {
    const previous = api.SelectObject(dc, hbm);
    api.PatBlt(dc, 0, 0, size, size, rop);
    api.DrawIconEx(dc, 0, 0, hicon, size, size, 0, 0, DI_NORMAL);
    api.SelectObject(dc, previous);
    const buf = Buffer.alloc(size * size * 4);
    api.GetDIBits(dc, hbm, 0, size, buf, bitmapHeader(size), 0);
    return buf;
  };
  try {
    const onBlack = grab(BLACKNESS);
    const onWhite = grab(WHITENESS);
    const out = Buffer.alloc(size * size * 4);
    let minX = size, minY = size, maxX = -1, maxY = -1;
    for (let i = 0; i < out.length; i += 4) {
      const diff = (onWhite[i] - onBlack[i]) + (onWhite[i + 1] - onBlack[i + 1]) + (onWhite[i + 2] - onBlack[i + 2]);
      const alpha = Math.max(0, Math.min(255, 255 - Math.round(diff / 3)));
      // Sur fond noir, les couleurs sont déjà prémultipliées par l'alpha.
      out[i] = Math.min(onBlack[i], alpha);
      out[i + 1] = Math.min(onBlack[i + 1], alpha);
      out[i + 2] = Math.min(onBlack[i + 2], alpha);
      out[i + 3] = alpha;
      if (alpha > 8) {
        const px = (i / 4) % size;
        const py = Math.floor(i / 4 / size);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    return { buffer: out, contentW: maxX - minX + 1, contentH: maxY - minY + 1, empty: maxX < 0 };
  } finally {
    api.DeleteObject(hbm);
    api.DeleteDC(dc);
  }
}

function render(kind, index, size) {
  const hicon = iconFromList(kind, index);
  if (!hicon) return null;
  try {
    return renderIcon(hicon, size);
  } finally {
    api.DestroyIcon(hicon);
  }
}

/** Data URL PNG de l'icône Windows de `path` (128 px si disponible), ou null. */
function shellIcon(path) {
  if (!api) return null;
  const info = {};
  if (!api.SHGetFileInfoW(path, 0, info, api.koffi.sizeof(api.SHFILEINFOW), SHGFI_SYSICONINDEX)) return null;

  // Les anciennes applications n'ont pas d'icône 256 px : Windows place alors une petite
  // icône dans le coin d'une image vide. Dans ce cas on prend la version 48 px.
  const jumbo = render(SHIL_JUMBO, info.iIcon, 256);
  if (jumbo && !jumbo.empty && (jumbo.contentW > 64 || jumbo.contentH > 64)) {
    return nativeImage.createFromBitmap(jumbo.buffer, { width: 256, height: 256 })
      .resize({ width: 128, height: 128, quality: 'best' })
      .toDataURL();
  }
  const large = render(SHIL_EXTRALARGE, info.iIcon, 48);
  if (large && !large.empty) {
    return nativeImage.createFromBitmap(large.buffer, { width: 48, height: 48 }).toDataURL();
  }
  return null;
}

module.exports = { shellIcon };
