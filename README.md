# Authenticator

掃描 QR Code 產生兩步驟驗證碼的手機 App（TOTP / HOTP），相容 Google Authenticator、Microsoft Authenticator 等使用的標準格式。

## 下載安裝（Android）

**[⬇ 下載最新版 APK](https://github.com/BensonFanNccu/authenticator/releases/latest/download/authenticator.apk)**（各版本與更新說明見 [Releases](https://github.com/BensonFanNccu/authenticator/releases)）

1. 在手機上開啟上面的連結下載 `authenticator.apk`
2. 點開檔案，依提示允許「安裝未知來源的應用程式」
3. 若 Google Play 安全防護跳出警告，選「仍要安裝」（因為不是從 Play 商店下載的）

需要 Android 7.0 以上。iPhone 目前不支援。

**更新**：下載新版 APK 直接安裝即可，帳號資料會保留。**不要先解除安裝**，解除安裝會刪掉所有帳號。

> [!WARNING]
> 這個 App 目前**沒有備份功能**。解除安裝、清除 App 資料或換手機，裡面的帳號都會消失。加入帳號時，請同時在各網站保存好**備援碼**，以免無法登入。

## 功能

- 用相機掃描 `otpauth://` QR Code 新增帳號
- 從相簿的截圖匯入 QR Code（在同一支手機上設定時很方便）
- 手動輸入金鑰，可調整演算法（SHA-1 / SHA-256 / SHA-512）、位數（6–8）、週期
- 匯入 Google Authenticator「匯出帳戶」的 `otpauth-migration://` QR Code，一次轉移多個帳號
- 支援 HOTP（依計數器），按鈕產生下一組
- 點一下複製驗證碼（Android 13+ 標記為敏感內容，不會在剪貼簿預覽中顯示）
- 長按編輯名稱或刪除
- 同一金鑰重複加入時自動略過

## 安全性

- 金鑰存在 Android Keystore / iOS Keychain（`expo-secure-store`），由系統加密，不會上傳。
- 驗證碼完全在手機上計算，App 不需要網路。
- Android 的 Keystore 資料不會隨系統備份還原，換手機前請先在各服務設定好備用驗證方式或備援碼。
- 原始碼全部公開，APK 由 [EAS Build](https://docs.expo.dev/build/introduction/) 從這個 repo 建置，Release 頁面附有 SHA-256 可核對檔案。

---

## 開發

以下是給想修改或自行建置的人。App 用 [Expo](https://expo.dev) + React Native 製作。

### 用 Expo Go 在手機上執行

1. 手機安裝 **Expo Go**（App Store / Google Play）
2. 電腦上執行：

   ```bash
   npm install
   npx expo start
   ```

3. 用手機掃描終端機顯示的 QR Code（iPhone 用相機 App，Android 用 Expo Go）。手機和電腦需在同一個網路；不同網路時改用 `npx expo start --tunnel`。

`npx expo start --web` 可以在瀏覽器預覽介面，但 **web 版的資料以未加密的 localStorage 儲存，只供開發預覽，不要放真正的金鑰**。

Expo Go 不會混淆程式碼，有些問題只會出現在正式版 APK（見下方「注意」），發布前務必用 APK 實機測試。

### 打包 APK

用 Expo 的雲端建置服務 EAS Build，電腦不需要安裝 Android Studio。

1. 到 [expo.dev](https://expo.dev/signup) 註冊免費帳號
2. 登入並建置：

   ```bash
   npx eas-cli@latest login
   npm run build:apk
   ```

   第一次會詢問是否建立 EAS 專案、是否產生 Android 簽章金鑰（Keystore），都選 **Yes**。金鑰由 EAS 保管，之後更新版本會用同一把簽章，使用者才能直接覆蓋安裝。

3. 建置完成後終端機會顯示下載連結與 QR Code。

設定在 `eas.json` 的 `preview` profile（輸出 APK）。上架 Google Play 用 `production` profile，會輸出 AAB。套件名稱是 `com.benson.authenticator`（在 `app.json`），**第一次上架後就不能改**。

### 發布新版本

1. 在 `app.json` 調高 `version`（例如 `1.0.3`）和 `android.versionCode`（每次 +1，Android 不允許安裝較小的 versionCode）
2. `npm run build:apk`，建置完成後下載 APK 並**在手機上實測掃描功能**
3. commit、push，然後建立 Release，檔名固定用 `authenticator.apk`，README 的「下載最新版」連結才會指向新版：

   ```bash
   gh release create v1.0.3 authenticator.apk --title "v1.0.3" --notes "更新說明"
   ```

### 測試與檢查

```bash
npm test            # 單元測試（RFC 4226 / 6238 官方測試向量、URI 與匯出格式解析）
npm run typecheck   # TypeScript 型別檢查
npx expo lint       # ESLint
```

### 專案結構

| 路徑 | 內容 |
| --- | --- |
| `src/lib/otp.ts` | HOTP / TOTP 演算法 |
| `src/lib/base32.ts` | Base32 編解碼 |
| `src/lib/otpauth.ts` | `otpauth://` 與 Google Authenticator 匯出格式解析 |
| `src/lib/account.ts` | 帳號資料型別、驗證、驗證碼產生 |
| `src/lib/vault.ts` | 帳號的安全儲存（每個帳號一筆 + 一筆排序索引） |
| `src/providers/` | 帳號狀態、Toast 提示 |
| `src/app/` | 畫面（Expo Router）：列表、新增、掃描、手動輸入、編輯 |
| `test/` | 單元測試（Node 內建 test runner） |

### 注意：不要移除 `app.json` 裡的 `expo-build-properties` 設定

- `enableMinifyInReleaseBuilds: false`：AGP 9 預設的 R8 完整模式會刪掉 ML Kit 內部初始化需要的類別（[googlesamples/mlkit#1018](https://github.com/googlesamples/mlkit/issues/1018)），導致正式版的 QR 掃描與相片辨識全部失效，但開發模式（Expo Go）不會混淆，一切正常，很難察覺。
- `manifestQueries` 宣告 `com.android.vending`：expo-camera 用查詢 Play 商店套件來判斷有沒有 Play 服務，Android 11 以上沒宣告就查不到。
- `buildArchs` 只打包 ARM：手機都是 ARM，x86 只給模擬器用，加上去 APK 幾乎大一倍。

## 授權

[MIT](LICENSE)
