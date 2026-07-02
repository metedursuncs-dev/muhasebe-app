# Muhasebe Takip Paneli

Ofis içi kullanım için müvekkil bazlı aylık evrak/beyanname takip paneli ve ekip içi ortak not panosu. React + TypeScript + Vite + Tailwind CSS ile yazıldı, verileri Firebase (Firestore) üzerinde tutar.

## Özellikler

- Müvekkil listesi, arama, müvekkil ekleme/silme
- Sütunlar iki tipte olabilir: **Tik** (evet/hayır) ya da **Çoklu Durum** (kullanıcının kendi tanımladığı renkli durumlar)
- Aylar arası gezinme — her ayın takip verisi ayrı tutulur
- Hangi kutucuğu kimin ne zaman işaretlediğini gösteren tooltip
- Aciliyet seviyesine (düşük/orta/acil) göre renklenen ortak not panosu
- Basit kullanıcı adı/şifre ile giriş (bkz. aşağıdaki güvenlik notu)

## Kurulum

```bash
npm install
npm run dev
```

## Firebase kurulumu (ilk kez)

Bu proje kendi Firebase projesine bağlıdır (`src/firebase.ts` içindeki `firebaseConfig`). Sıfırdan kurulum için:

1. **Firestore veritabanı** oluşturulmuş olmalı (Firebase Console > Firestore Database).
2. **Anonymous Authentication**'ı açın: Firebase Console > Authentication > Sign-in method > Anonymous > Enable. (Uygulama, güvenlik kurallarının çalışabilmesi için arka planda anonim oturum açıyor; kullanıcıya bu görünmez.)
3. **Güvenlik kurallarını** yapıştırın: Firebase Console > Firestore Database > Rules sekmesine bu reponun kökündeki [`firestore.rules`](firestore.rules) dosyasının içeriğini yapıştırıp yayınlayın (Publish).
4. **Kullanıcıları elle oluşturun**: Firebase Console > Firestore Database > `users` koleksiyonuna, her kullanıcı için bir doküman ekleyin:
   - `username`: küçük harf kullanıcı adı (örn. `mete.dursun`)
   - `password`: düz metin şifre
   - `displayName`: ekranda görünecek ad (örn. `Mete Dursun`)
   - `role`: `admin`

Kayıt/self-servis akışı yoktur — kullanıcılar sadece Firebase Console'dan elle eklenir/silinir.

## Güvenlik notu

Uygulama Firebase Authentication yerine basit bir kullanıcı adı/şifre kontrolü kullanır (Firestore'daki `users` koleksiyonuna karşı, istemci tarafında düz metin karşılaştırma). Bu, kurulumu kolaylaştırır ama gerçek kullanıcı ayrımı yapamaz ve şifreler Firestore'da düz metin olarak durur; tüm koleksiyonlar sadece "bir Firebase oturumu var mı" şartına göre korunur. Küçük, dahili bir ekip aracı için kabul edilebilir bir basitleştirmedir. Daha yüksek güvenlik gerekiyorsa Firebase Authentication'a (e-posta/şifre) geçilmesi önerilir.

## Komutlar

```bash
npm run dev       # geliştirme sunucusu
npm run build     # production build
npm run lint      # oxlint
npm run preview   # production build'i lokal önizleme
```
