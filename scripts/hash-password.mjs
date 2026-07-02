// Şifreni hiç kimseyle (bu arada bana da) paylaşmadan Firestore'a kaydedilecek hash'i
// kendi bilgisayarında üretmek için kullanılır.
//
// Kullanım:
//   node scripts/hash-password.mjs "sifreniz"
//
// Çıktıyı kopyalayıp Firebase Console > Firestore > users koleksiyonunda
// ilgili kullanıcının "passwordHash" alanına yapıştırın.

import { createHash } from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('Kullanım: node scripts/hash-password.mjs "sifreniz"');
  process.exit(1);
}

const hash = createHash('sha256').update(password, 'utf8').digest('hex');
console.log(hash);
