// Firestore'u ilk müvekkil listesi ve varsayılan sütunlarla doldurmak için tek seferlik script.
//
// Kullanım:
//   node scripts/seed-data.mjs
//
// Not: Firebase Console'da Authentication > Sign-in method > Anonymous açık olmalı,
// aksi halde bu script de "auth/configuration-not-found" hatası alır.

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyABvXTNz9NsgmKejoFwjR95BVwI9XMLcg8',
  authDomain: 'muhasebe-app-36eda.firebaseapp.com',
  projectId: 'muhasebe-app-36eda',
  storageBucket: 'muhasebe-app-36eda.firebasestorage.app',
  messagingSenderId: '216178798300',
  appId: '1:216178798300:web:39775f0066c2fbe4cd4e19',
};

const RAW_CLIENTS = [
  ['0004', 'CEM GAYRİMENKUL ANONİM ŞİRKETİ'],
  ['0006', 'T.EMLAKSAN TUFAN YILDIZ'],
  ['0007', 'HALİL İBRAHİM KOÇ'],
  ['0009', 'SELEM TİCARET ÜMİT GÖMLEKSİZ'],
  ['0013', 'S.M.M.M DÜNDAR DURSUN'],
  ['0014', 'SİSMAKSAN SİSTEM MAKİNA SAN. VE TİC. LTD.ŞTİ.'],
  ['0015', 'İNCİ ÇAY OCAĞI AZİZ İNCİ'],
  ['0017', 'TMK MAKİNA KALIP SANAYİ VE TİC LTD.ŞTİ'],
  ['0018', 'ALTINMAK MAKİNA KALIP SAN.VE TİC.LTD.ŞTİ.'],
  ['0020', 'BEYOĞLU PASTA CAFE BÜLENT EŞKİ'],
  ['0024', 'MEDİNE EŞKİ'],
  ['0026', 'YENER EŞKİ'],
  ['0029', 'ÖZGÜR BALLIKAYA VE FERHAT BALLIKAYA ADİ ORTAKLIĞI'],
  ['0030', 'BALLIKAYA TURİZM LİMİTED ŞİRKETİ'],
  ['0033', 'MUSTAFA KALELİ'],
  ['0034', 'TAYPEN PLASTİK DOĞRAMA CAM İNŞ GIDA SAN.VE TİC.LTD.ŞTİ'],
  ['0035', 'BAYAR GLOBAL ENDÜSTRİ PLASTİK VE ALÜMİNYUM A.Ş.'],
  ['0037', 'MEGA STİLL GÖLGELENDİRME SİSTEMLERİ LTD ŞTİ'],
  ['0038', 'EREN ELEKTRİK SAN.VE TİC.A.Ş'],
  ['0060', 'BCS HARİTA MÜHENDİSLİK İNŞAAT SANAYİ TİC.LTD.ŞTİ.'],
  ['0061', 'KANBER ÖZDEMİR'],
  ['0063', 'CLEMENCE CAFE RESTAURANT KURBANİ KARA'],
  ['0069', 'SB KIRTASİYE ELEKTRONİK BİLG.TEMİZLİK LTD.ŞTİ.'],
  ['0071', 'ZORLU KIRTASİYE ALİ ESEN'],
  ['0072', 'MOJ MİRZADA BUTİK HÜLYA BAYAR'],
  ['0075', 'BEYOĞLU GRUP KATERİNG SANAYİ TİCARET LTD.ŞTİ.'],
  ['0088', 'ICM ULUSLARARASI İNŞ.DAN.PAZ. SAN.DIŞ TİC.A.Ş.'],
  ['0092', 'CİBADİ MAKİNA SANAYİ ERCAN USLU'],
  ['0102', 'AKES MAKİNA TAKIM SANAYİ VE TİCARET LTD.ŞTİ'],
  ['0108', 'DURSUNLAR MAKİNA BÜLENT DURSUN'],
  ['0109', 'REKOR VİDA SANAYİ TİCARET LİMİTED ŞİRKETİ'],
  ['0115', 'ETKİN LAZER TEKNOLOJİLERİ SAN.TİC.LTD.ŞTİ.'],
  ['0125', 'OPTİMUM ELEKTRONİK BİLGİSAYAR SAN.TİC.LTD.ŞTİ'],
  ['0131', 'TECHNICS ENDÜSTRİYEL DAĞCILIK HALİL KILIÇ'],
  ['0134', 'BG INTERNATIONAL ALÜMİNYUM VE PLASTİK DIŞ TİCARET LİMİTED ŞİRKETİ'],
  ['0152', 'BUTEK ASANSÖR SAN.VE DIŞ TİC. BERÇ ÖZKARAYAN'],
  ['0154', 'ER MÜHENDİSLİK ELEKTRONİK SAN. VE TİC.LTD.ŞTİ.'],
  ['0156', 'ÇETİNTAŞ GIDA PAZARI EMRAH ÇETİNTAŞ'],
  ['0161', 'ÇEVİK TUR FATİH ÇEVİK'],
  ['0162', 'UĞURCAN KILIÇ UĞURCAN KILIÇ'],
  ['0176', 'AY KUAFÖR OĞUZ ÇAĞLAR'],
  ['0177', 'SERVİS TAŞIMA ABDULLAH UZUN'],
  ['0182', 'FBG SPOR STÜDYOSU SAMET GEDİK'],
  ['0183', 'YILMAZ IRMAK'],
  ['0184', 'ALPASLAN SAYIN'],
  ['0185', 'EMRE DOĞAN ACAR'],
  ['0203', 'MALTEPE 8 NOLU AİLE SAĞLIK MERKEZİ NURBAY IŞIK'],
];

const DEFAULT_STATUSES = [
  { key: 'gelmedi', label: 'Gelmedi', color: 'rose' },
  { key: 'geldi', label: 'Geldi', color: 'amber' },
  { key: 'islendi', label: 'İşlendi', color: 'emerald' },
];

const COLUMNS = [
  { title: 'KDV Beyannamesi', order: 0, type: 'status', statuses: DEFAULT_STATUSES },
  { title: 'Muhtasar', order: 1, type: 'status', statuses: DEFAULT_STATUSES },
  { title: 'SGK Bildirgesi', order: 2, type: 'checkbox' },
  { title: 'Geçici Vergi', order: 3, type: 'status', statuses: DEFAULT_STATUSES },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInAnonymously(auth);
  console.log('Anonim oturum açıldı.');

  const clientsRef = collection(db, 'clients');
  const existingClients = await getDocs(clientsRef);
  if (!existingClients.empty) {
    console.log(`"clients" koleksiyonunda zaten ${existingClients.size} kayıt var, müvekkiller atlanıyor.`);
  } else {
    for (const [companyCode, name] of RAW_CLIENTS) {
      await addDoc(clientsRef, { companyCode, name, isDeleted: false });
    }
    console.log(`${RAW_CLIENTS.length} müvekkil eklendi.`);
  }

  const columnsRef = collection(db, 'columns');
  const existingColumns = await getDocs(columnsRef);
  if (!existingColumns.empty) {
    console.log(`"columns" koleksiyonunda zaten ${existingColumns.size} kayıt var, sütunlar atlanıyor.`);
  } else {
    for (const col of COLUMNS) {
      await addDoc(columnsRef, col);
    }
    console.log(`${COLUMNS.length} sütun eklendi.`);
  }

  console.log('Bitti.');
  process.exit(0);
}

main().catch(err => {
  console.error('Hata:', err.message ?? err);
  process.exit(1);
});
