import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

// --- ĐỌC THAM SỐ TỪ MÔI TRƯỜNG / ARGUMENTS ---
const URL_BAT_DAU = process.env.URL_BAT_DAU || 'https://www.thegioididong.com/game-app/';
const TOI_DA_TRANG = parseInt(process.env.TOI_DA_TRANG || '1000', 10);
const SO_LUONG_CAO_CUNG_LUC = parseInt(process.env.SO_LUONG_CAO_CUNG_LUC || '10', 10);
const NGUONG_GHI_DINH_KY = parseInt(process.env.NGUONG_GHI_DINH_KY || '50', 10);

const THU_MUC_DATA = './thu_muc_du_lieu';

console.log('==================================================');
console.log('[KHỞI ĐỘNG] Cấu hình bot:');
console.log(` - URL bắt đầu: ${URL_BAT_DAU}`);
console.log(` - Tối đa trang: ${TOI_DA_TRANG}`);
console.log(` - Luồng đồng thời: ${SO_LUONG_CAO_CUNG_LUC}`);
console.log(` - Ngưỡng ghi đĩa: ${NGUONG_GHI_DINH_KY} trang`);
console.log('==================================================');

// --- HÀM TỰ CHIA NHỎ VÀ GHI FILE DƯỚI 18MB ---
function ghiDuLieuChiaNho(tenTienTo, duLieu, maxMB = 18) {
  if (!fs.existsSync(THU_MUC_DATA)) {
    fs.mkdirSync(THU_MUC_DATA, { recursive: true });
  }

  const fileCu = fs.readdirSync(THU_MUC_DATA);
  for (const f of fileCu) {
    if (f.startsWith(`${tenTienTo}_phieu_`) || f === `${tenTienTo}_tong_quan.json`) {
      fs.unlinkSync(path.join(THU_MUC_DATA, f));
    }
  }

  const maxBytes = maxMB * 1024 * 1024;

  if (Array.isArray(duLieu)) {
    let phieuHienTai = [];
    let dungLuongHienTai = 0;
    let chiSoPhieu = 1;

    for (const item of duLieu) {
      const chuoi = JSON.stringify(item);
      const kichThuoc = Buffer.byteLength(chuoi, 'utf-8');

      if (dungLuongHienTai + kichThuoc > maxBytes && phieuHienTai.length > 0) {
        fs.writeFileSync(
          path.join(THU_MUC_DATA, `${tenTienTo}_phieu_${chiSoPhieu}.json`),
          JSON.stringify(phieuHienTai),
          'utf-8'
        );
        chiSoPhieu++;
        phieuHienTai = [];
        dungLuongHienTai = 0;
      }
      phieuHienTai.push(item);
      dungLuongHienTai += kichThuoc;
    }

    if (phieuHienTai.length > 0) {
      fs.writeFileSync(
        path.join(THU_MUC_DATA, `${tenTienTo}_phieu_${chiSoPhieu}.json`),
        JSON.stringify(phieuHienTai),
        'utf-8'
      );
    }

    fs.writeFileSync(
      path.join(THU_MUC_DATA, `${tenTienTo}_tong_quan.json`),
      JSON.stringify({ tongSoPhieu: chiSoPhieu, tongSoPhanTu: duLieu.length }),
      'utf-8'
    );
  } else if (typeof duLieu === 'object' && duLieu !== null) {
    const dacCacKhoa = Object.keys(duLieu);
    let phieuHienTai = {};
    let dungLuongHienTai = 0;
    let chiSoPhieu = 1;

    for (const khoa of dacCacKhoa) {
      const chuoiGiaTri = JSON.stringify(duLieu[khoa]);
      const kichThuoc = Buffer.byteLength(`"${khoa}":${chuoiGiaTri},`, 'utf-8');

      if (dungLuongHienTai + kichThuoc > maxBytes && Object.keys(phieuHienTai).length > 0) {
        fs.writeFileSync(
          path.join(THU_MUC_DATA, `${tenTienTo}_phieu_${chiSoPhieu}.json`),
          JSON.stringify(phieuHienTai),
          'utf-8'
        );
        chiSoPhieu++;
        phieuHienTai = {};
        dungLuongHienTai = 0;
      }
      phieuHienTai[khoa] = duLieu[khoa];
      dungLuongHienTai += kichThuoc;
    }

    if (Object.keys(phieuHienTai).length > 0) {
      fs.writeFileSync(
        path.join(THU_MUC_DATA, `${tenTienTo}_phieu_${chiSoPhieu}.json`),
        JSON.stringify(phieuHienTai),
        'utf-8'
      );
    }

    fs.writeFileSync(
      path.join(THU_MUC_DATA, `${tenTienTo}_tong_quan.json`),
      JSON.stringify({ tongSoPhieu: chiSoPhieu, tongSoKhoa: dacCacKhoa.length }),
      'utf-8'
    );
  }
}

// --- HÀM ĐỌC DỮ LIỆU TỪ CÁC FILE CHIA NHỎ ---
function docDuLieuChiaNho(tenTienTo, giaTriMacDinh) {
  const fileTongQuan = path.join(THU_MUC_DATA, `${tenTienTo}_tong_quan.json`);
  if (!fs.existsSync(fileTongQuan)) {
    console.log(`[ĐỌC FILE] Không tìm thấy dữ liệu cũ cho '${tenTienTo}', khởi tạo mới.`);
    return giaTriMacDinh;
  }

  try {
    const tongQuan = JSON.parse(fs.readFileSync(fileTongQuan, 'utf-8'));
    console.log(`[ĐỌC FILE] Nạp '${tenTienTo}': Tìm thấy ${tongQuan.tongSoPhieu} phiếu...`);

    if (Array.isArray(giaTriMacDinh)) {
      let ketQua = [];
      for (let i = 1; i <= tongQuan.tongSoPhieu; i++) {
        const filePhieu = path.join(THU_MUC_DATA, `${tenTienTo}_phieu_${i}.json`);
        if (fs.existsSync(filePhieu)) {
          const noiDung = JSON.parse(fs.readFileSync(filePhieu, 'utf-8'));
          ketQua = ketQua.concat(noiDung);
        }
      }
      return ketQua;
    } else {
      let ketQua = {};
      for (let i = 1; i <= tongQuan.tongSoPhieu; i++) {
        const filePhieu = path.join(THU_MUC_DATA, `${tenTienTo}_phieu_${i}.json`);
        if (fs.existsSync(filePhieu)) {
          const noiDung = JSON.parse(fs.readFileSync(filePhieu, 'utf-8'));
          Object.assign(ketQua, noiDung);
        }
      }
      return ketQua;
    }
  } catch (e) {
    console.error(`[LỖI ĐỌC FILE] File '${tenTienTo}' bị lỗi cấu trúc: ${e.message}`);
    return giaTriMacDinh;
  }
}

// --- KHỞI TẠO DỮ LIỆU ---
console.log('[NẠP DỮ LIỆU] Đang đọc trạng thái cũ từ đĩa...');
let tuDien = docDuLieuChiaNho('tu_dien', {}); 
let mucLucNguoc = docDuLieuChiaNho('muc_luc_nguoc', {}); 
let khoTaiLieu = docDuLieuChiaNho('kho_tai_lieu', {}); 
let daCaoList = docDuLieuChiaNho('danh_sach_da_cao', []);
let daCaoSet = new Set(daCaoList);
let doThiLienKet = docDuLieuChiaNho('do_thi_lien_ket', {}); 
let hangDoiCho = docDuLieuChiaNho('hang_doi_cho', []);

const chuaCaoKhong = hangDoiCho.some(u => !daCaoSet.has(u));

if (hangDoiCho.length === 0 || !chuaCaoKhong) {
  console.log('[LOG HÀNG ĐỢI] Hàng đợi rỗng hoặc tất cả link trong hàng đợi đều đã cào. Đẩy lại URL_BAT_DAU!');
  hangDoiCho.push(URL_BAT_DAU);
  daCaoSet.delete(URL_BAT_DAU);
  daCaoList = daCaoList.filter(u => u !== URL_BAT_DAU);
}

console.log(`[TRẠNG THÁI KHỞI ĐỘNG]:`);
console.log(` - Kho tài liệu: ${Object.keys(khoTaiLieu).length} trang`);
console.log(` - Từ điển: ${Object.keys(tuDien).length} từ`);
console.log(` - Đã cào: ${daCaoSet.size} URL`);
console.log(` - Hàng đợi còn: ${hangDoiCho.length} URL`);

let mapUrlToDocId = {};
for (const [dId, info] of Object.entries(khoTaiLieu)) {
  mapUrlToDocId[info.u] = parseInt(dId, 10);
}

let docIdHienTai = Object.keys(khoTaiLieu).length + 1;
let wordIdHienTai = Object.keys(tuDien).length + 1;
let dangChay = 0;
let soTrangDaCaoTrongPhien = 0;
let soTrangCanGhiBu = 0;

function tinhToanPageRank() {
  console.log('[PAGERANK] Đang chạy thuật toán tính điểm uy tín trang...');
  const soLuongDoc = Object.keys(khoTaiLieu).length;
  if (soLuongDoc === 0) {
    console.log('[PAGERANK] Kho tài liệu rỗng, bỏ qua tính toán.');
    return;
  }

  const dampingFactor = 0.85;
  const iterations = 20;

  let pr = {};
  for (const dId of Object.keys(khoTaiLieu)) {
    pr[dId] = 1 / soLuongDoc;
    if (!khoTaiLieu[dId].pr) khoTaiLieu[dId].pr = 1 / soLuongDoc;
  }

  for (let i = 0; i < iterations; i++) {
    let newPr = {};
    let chung = (1 - dampingFactor) / soLuongDoc;

    for (const dId of Object.keys(khoTaiLieu)) {
      let sum = 0;
      for (const [nguonId, dsDich] of Object.entries(doThiLienKet)) {
        if (dsDich.includes(parseInt(dId, 10))) {
          let soLuongOutLinks = dsDich.length;
          if (soLuongOutLinks > 0) {
            sum += pr[nguonId] / soLuongOutLinks;
          }
        }
      }
      newPr[dId] = chung + dampingFactor * sum;
    }
    pr = newPr;
  }

  for (const [dId, score] of Object.entries(pr)) {
    if (khoTaiLieu[dId]) {
      khoTaiLieu[dId].pr = score;
    }
  }
  console.log('[PAGERANK] Đã tính điểm xong cho tất cả trang!');
}

function luuTatCaXuongDia() {
  console.log('[GHI ĐĨA] Bắt đầu đồng bộ dữ liệu xuống đĩa...');
  tinhToanPageRank();
  ghiDuLieuChiaNho('tu_dien', tuDien);
  ghiDuLieuChiaNho('muc_luc_nguoc', mucLucNguoc);
  ghiDuLieuChiaNho('kho_tai_lieu', khoTaiLieu);
  ghiDuLieuChiaNho('danh_sach_da_cao', daCaoList);
  ghiDuLieuChiaNho('do_thi_lien_ket', doThiLienKet);
  ghiDuLieuChiaNho('hang_doi_cho', hangDoiCho);
  soTrangCanGhiBu = 0;
  console.log('[GHI ĐĨA] Đã ghi xong toàn bộ dữ liệu!');
}

async function xuLyMotTrang(urlDangXuLy) {
  const stt = soTrangDaCaoTrongPhien + 1;
  console.log(`\n[BẮT ĐẦU CÀO #${stt}/${TOI_DA_TRANG}] -> ${urlDangXuLy}`);

  try {
    const startTime = Date.now();
    const response = await axios.get(urlDangXuLy, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const duration = Date.now() - startTime;
    console.log(` [HTTP ${response.status}] Tải trang thành công trong ${duration}ms`);

    const maHtml = response.data;
    if (!maHtml || typeof maHtml !== 'string') {
      console.log(` [BỎ QUA] Trả về không phải dạng văn bản HTML.`);
      return;
    }

    const $ = cheerio.load(maHtml);
    const tieuDe = $('title').text().trim() || 'Không có tiêu đề';
    
    $('script, style, noscript, iframe').remove();
    const noiDungTho = $('body').text().toLowerCase();
    const chuoiSachSe = noiDungTho.replace(/[^\w\sàáạảãâấầẩẫậăắằẳẵặèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/g, ' ');
    const danhSachTu = chuoiSachSe.split(/\s+/).filter(tu => tu.length > 1);

    if (danhSachTu.length === 0) {
      console.log(` [BỎ QUA] Không bóc tách được từ ngữ nào.`);
      return;
    }

    const docId = docIdHienTai++;
    mapUrlToDocId[urlDangXuLy] = docId;
    khoTaiLieu[docId] = { u: urlDangXuLy, t: tieuDe, pr: 1.0 };
    doThiLienKet[docId] = [];

    const viTriTu = Object.create(null);
    danhSachTu.forEach((tu, viTri) => {
      if (!viTriTu[tu]) viTriTu[tu] = [];
      viTriTu[tu].push(viTri);
    });

    for (const tu of Object.keys(viTriTu)) {
      const danhSachViTri = viTriTu[tu];
      if (!tuDien[tu]) tuDien[tu] = wordIdHienTai++;
      const wordId = tuDien[tu];

      if (!mucLucNguoc[wordId]) mucLucNguoc[wordId] = [];
      mucLucNguoc[wordId].push([docId, danhSachViTri]);
    }

    soTrangDaCaoTrongPhien++;
    soTrangCanGhiBu++;

    console.log(` [HOÀN THÀNH #${stt}] Tiêu đề: "${tieuDe}" | Bóc tách: ${danhSachTu.length} từ (Độc bản: ${Object.keys(viTriTu).length})`);

    let linkMoiThem = 0;
    $('a[href]').each((_, el) => {
      let linkMoi = $(el).attr('href');
      if (linkMoi && !linkMoi.startsWith('javascript:') && !linkMoi.startsWith('#')) {
        try {
          const urlHoanChinh = new URL(linkMoi, urlDangXuLy).href;
          const dinhDangBaoQua = /\.(png|jpg|jpeg|gif|svg|pdf|zip|rar|css|js|mp4|mp3)$/i;

          if (urlHoanChinh.startsWith('http') && !dinhDangBaoQua.test(urlHoanChinh)) {
            if (mapUrlToDocId[urlHoanChinh]) {
              const targetDocId = mapUrlToDocId[urlHoanChinh];
              if (!doThiLienKet[docId].includes(targetDocId)) {
                doThiLienKet[docId].push(targetDocId);
              }
            }
            if (!daCaoSet.has(urlHoanChinh) && !hangDoiCho.includes(urlHoanChinh)) {
              hangDoiCho.push(urlHoanChinh);
              linkMoiThem++;
            }
          }
        } catch (e) {}
      }
    });

    console.log(` [LIÊN KẾT] Đã phát hiện và nạp thêm +${linkMoiThem} link mới vào hàng đợi.`);

    if (soTrangCanGhiBu >= NGUONG_GHI_DINH_KY) {
      console.log(` [MỐC LƯU] Đã đạt ngưỡng ${NGUONG_GHI_DINH_KY} trang, chuẩn bị đồng bộ đĩa...`);
      luuTatCaXuongDia();
    }

  } catch (err) {
    if (err.response) {
      console.error(` [LỖI HTTP ${err.response.status}] ${urlDangXuLy}`);
    } else if (err.code === 'ECONNABORTED') {
      console.error(` [LỖI TIMEOUT] Hết 15s timeout kết nối từ ${urlDangXuLy}`);
    } else {
      console.error(` [LỖI KẾT NỐI] ${urlDangXuLy} -> ${err.message}`);
    }
  }
}

function chayBotCrawl() {
  if (soTrangDaCaoTrongPhien >= TOI_DA_TRANG) {
    console.log('\n[KẾT THÚC SEED] Đã cào đủ số lượng trang yêu cầu!');
    luuTatCaXuongDia(); 
    return;
  }

  if (hangDoiCho.length === 0 && dangChay === 0) {
    console.log('\n[KẾT THÚC SEED] Hàng đợi hoàn toàn rỗng!');
    luuTatCaXuongDia();
    return;
  }

  while (dangChay < SO_LUONG_CAO_CUNG_LUC && hangDoiCho.length > 0 && soTrangDaCaoTrongPhien < TOI_DA_TRANG) {
    const urlDangXuLy = hangDoiCho.shift();
    if (daCaoSet.has(urlDangXuLy)) {
      continue;
    }

    daCaoSet.add(urlDangXuLy);
    daCaoList.push(urlDangXuLy);

    dangChay++;
    xuLyMotTrang(urlDangXuLy).finally(() => {
      dangChay--;
      chayBotCrawl(); 
    });
  }
}

process.on('SIGINT', () => {
  console.log('\n[CẢNH BÁO] Nhận lệnh ngắt khẩn cấp! Đang lưu dữ liệu xuống đĩa...');
  luuTatCaXuongDia();
  process.exit();
});

console.log('[BẮT ĐẦU VÒNG LẶP CÀO...]');
chayBotCrawl();
