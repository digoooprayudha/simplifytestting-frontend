# PRP: Figma-to-Katalon Context Engine

## **1. Project Overview**

Membangun sistem *preprocessing* data otomatis menggunakan **TypeScript** untuk mengekstraksi desain Figma menjadi aset siap uji. Fokus utama adalah sinkronisasi antara visual (Gambar Terlabeli) dan data teknis (Tabel Prompt) untuk meminimalisir halusinasi LLM saat membuat skrip Katalon.

---

## **2. Technical Specification Update**

### **Module B: High-Visibility Visual Grounding**

* **Color Profile:** Menggunakan warna **Pure Red (`#FF0000`)** dengan ketebalan garis 3-5 pixel agar menonjol di atas warna UI apa pun.
* **Box Spacing (Padding):** Menambahkan *offset/padding* sebesar **10px** ke luar dari koordinat asli `absoluteBoundingBox`. Ini memastikan teks atau border elemen asli Figma tidak tertutup oleh garis merah.
* **Labeling:** Menaruh label `[ID. Nama]` di luar kotak (biasanya di atas kiri) agar tidak mengganggu visibilitas elemen itu sendiri.

### **Module C: Token-Efficient Table Generator**

Menyusun data interaktif dalam format tabel Markdown untuk menghemat token dan memudahkan LLM melakukan pemetaan baris demi baris.

---

## **3. Prompt Structure Output (Table Format)**

Agent harus menghasilkan output prompt dengan struktur berikut:

**Context:** "Gunakan gambar terlampir dan tabel di bawah ini untuk membuat test case Katalon. Setiap ID pada tabel merujuk pada label nomor di gambar."

| ID | Element Name | Type | Text / Content | Action / Flow | Selector Hint (XPath) |
| --- | --- | --- | --- | --- | --- |
| 1 | `btn_login` | Button | "Masuk Sekarang" | Click -> Dashboard | `//button[@id='btn_login']` |
| 2 | `input_user` | Input | Placeholder: "Email" | Type Text | `//input[@name='username']` |
| 3 | `chk_remember` | Checkbox | "Ingat Saya" | Check/Uncheck | `//input[@type='checkbox']` |
| 4 | `lnk_forgot` | Link | "Lupa Password?" | Click -> Reset Pass | `//a[contains(text(),'Lupa')]` |

---

## **4. Updated Execution Logic for Agent**

1. **Extraction:** Tarik data via Figma REST API, filter hanya yang memiliki `reactions` atau tipe input.
2. **Processing Bounding Box:**
* Hitung `x - 10, y - 10, width + 20, height + 20` (untuk *spacing*).
* Gambar kotak merah menyala.
* Tempelkan label nomor dan nama elemen.

3. **Prompt Construction:** * Iterasi hasil filter ke dalam format baris tabel `| ID | Name | ... |`.
* Sematkan informasi *Object Repository* Katalon sebagai instruksi tambahan di bawah tabel.

---

## **5. Acceptance Criteria**

* **Visual:** Garis merah terlihat sangat jelas dan tidak menempel ketat pada konten elemen (ada ruang napas).
* **Data:** Tidak ada pengulangan kata "Type:", "Name:", dsb di dalam tabel untuk menghemat context window.
* **Katalon-Ready:** Kolom `Selector Hint` harus berisi XPath yang valid berdasarkan metadata Figma.