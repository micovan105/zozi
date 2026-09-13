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

// --- HÀM TỰ CHIA NHỎ VÀ GHI FILE DƯỚI 18MB ---
function ghiDuLieuChiaNho(tenTienTo, duLieu, maxMB = 18) {
  if (!fs.existsSync(THU_MUC_DATA)) {
    fs.mkdirSync(THU_MUC_DATA, { recursive: true });
  }

  // Dọn dẹp các file part cũ của tiền tố này
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
      const kíchThuoc = Buffer.byteLength(chuoi, 'utf-8');

      if (dungLuongHienTai + kíchThuoc > maxBytes && phieuHienTai.length > 0) {
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
      dungLuongHienTai += kíchThuoc;
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
      const kíchThuoc = Buffer.byteLength(`"${khoa}":${chuoiGiaTri},`, 'utf-8');

      if (dungLuongHienTai + kíchThuoc > maxBytes && Object.keys(phieuHienTai).length > 0) {
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
      dungLuongHienTai += kíchThuoc;
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
  if (!fs.existsSync(fileTongQuan)) return giaTriMacDinh;

  try {
    const tongQuan = JSON.parse(fs.readFileSync(fileTongQuan, 'utf-8'));
    
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
    return giaTriMacDinh;
  }
}

// --- KHỞI TẠO DỮ LIỆU ---
let tuDien = docDuLieuChiaNho('tu_dien', {}); 
let mucLucNguoc = docDuLieuChiaNho('muc_luc_nguoc', {}); 
let khoTaiLieu = docDuLieuChiaNho('kho_tai_lieu', {}); 
let daCaoList = docDuLieuChiaNho('danh_sach_da_cao', []);
let daCaoSet = new Set(daCaoList);
let doThiLienKet = docDuLieuChiaNho('do_thi_lien_ket', {}); 
let hangDoiCho = docDuLieuChiaNho('hang_doi_cho', []);

if (hangDoiCho.length === 0) {
  hangDoiCho.push(URL_BAT_DAU);
}

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
  if (soLuongDoc === 0) return;

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
  console.log('[HỆ THỐNG] Đang chạy PageRank và chia nhỏ lưu dữ liệu...');
  tinhToanPageRank();
  ghiDuLieuChiaNho('tu_dien', tuDien);
  ghiDuLieuChiaNho('muc_luc_nguoc', mucLucNguoc);
  ghiDuLieuChiaNho('kho_tai_lieu', khoTaiLieu);
  ghiDuLieuChiaNho('danh_sach_da_cao', daCaoList);
  ghiDuLieuChiaNho('do_thi_lien_ket', doThiLienKet);
  ghiDuLieuChiaNho('hang_doi_cho', hangDoiCho);
  soTrangCanGhiBu = 0;
  console.log('[HỆ THỐNG] Đã đồng bộ dữ liệu hoàn tất!');
}

async function xuLyMotTrang(urlDangXuLy) {
  console.log(`[ĐANG CÀO (${soTrangDaCaoTrongPhien + 1}/${TOI_DA_TRANG})] -> ${urlDangXuLy}`);
  try {
    const response = await axios.get(urlDangXuLy, { 
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.google.com/'
      },
      validateStatus: (status) => status === 200
    });

    const maHtml = response.data;
    if (!maHtml || typeof maHtml !== 'string') return;

    const $ = cheerio.load(maHtml);
    const tieuDe = $('title').text().trim() || 'Không có tiêu đề';
    
    // Loại bỏ script, style để lọc nội dung sạch
    $('script, style, noscript').remove();
    const noiDungTho = $('body').text().toLowerCase();
    const chuoiSachSe = noiDungTho.replace(/[^\w\sàáạảãâấầẩẫậăắằẳẵặèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹđ]/g, ' ');
    const danhSachTu = chuoiSachSe.split(/\s+/).filter(tu => tu.length > 1);

    if (danhSachTu.length === 0) return;

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

    if (soTrangCanGhiBu >= NGUONG_GHI_DINH_KY) {
      luuTatCaXuongDia();
    }

    $('a[href]').each((_, el) => {
      let linkMoi = $(el).attr('href');
      if (linkMoi && !linkMoi.startsWith('javascript:') && !linkMoi.startsWith('#')) {
        try {
          const urlHoanChinh = new URL(linkMoi, urlDangXuLy).href;
          const dinhDangBaoQua = /\.(png|jpg|jpeg|gif|svg|pdf|zip|rar|css|js)$/i;
          
          if (urlHoanChinh.startsWith('http') && !dinhDangBaoQua.test(urlHoanChinh)) {
            if (mapUrlToDocId[urlHoanChinh]) {
              const targetDocId = mapUrlToDocId[urlHoanChinh];
              if (!doThiLienKet[docId].includes(targetDocId)) {
                doThiLienKet[docId].push(targetDocId);
              }
            }
            if (!daCaoSet.has(urlHoanChinh) && !hangDoiCho.includes(urlHoanChinh)) {
              hangDoiCho.push(urlHoanChinh);
            }
          }
        } catch (e) {}
      }
    });

  } catch (err) {
    console.error(`[LỖI CÀO] ${urlDangXuLy} -> ${err.message}`);
  }
}

function chayBotCrawl() {
  if (soTrangDaCaoTrongPhien >= TOI_DA_TRANG) {
    console.log('Đã thu thập đủ số lượng trang yêu cầu!');
    luuTatCaXuongDia(); 
    return;
  }

  if (hangDoiCho.length === 0 && dangChay === 0) {
    console.log('Đã cạn sạch đường link trong hàng đợi!');
    luuTatCaXuongDia();
    return;
  }

  while (dangChay < SO_LUONG_CAO_CUNG_LUC && hangDoiCho.length > 0 && soTrangDaCaoTrongPhien < TOI_DA_TRANG) {
    const urlDangXuLy = hangDoiCho.shift();
    if (daCaoSet.has(urlDangXuLy)) continue;

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
  console.log('\n[CẢNH BÁO] Dừng chương trình! Đang lưu dữ liệu...');
  luuTatCaXuongDia();
  process.exit();
});

chayBotCrawl();
