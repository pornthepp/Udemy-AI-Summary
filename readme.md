# Udemy AI Summarizer (Gemini)
![Uploading image.png…]()

ส่วนขยาย Chrome สำหรับช่วยสรุปเนื้อหาคอร์สเรียน Udemy ด้วย AI (Gemini)
เวอร์ชัน: 1.2

## ความสามารถหลัก (Features)

*   **ดึงคำบรรยายอัตโนมัติ (Auto Transcript Extraction):** ดึงคำบรรยาย (Subtitle) ภาษาอังกฤษจากวิดีโอ Udemy โดยอัตโนมัติ พร้อมระบบช่วยเปิดแผง Transcript หากหาไม่เจอ
*   **สรุปเนื้อหาด้วย AI (AI Summarization):** ใช้ Google Gemini เพื่อสรุปใจความสำคัญของบทเรียนเป็นภาษาไทยที่เข้าใจง่าย
*   **รองรับ Markdown & Code Blocks:** แสดงผลสรุปในรูปแบบ Markdown ที่สวยงาม และหากบทเรียนมีโค้ดตัวอย่าง จะแสดงใน Code Block ที่อ่านง่าย
*   **Copy Code ได้ทันที:** มีปุ่ม Copy เฉพาะจุดสำหรับแต่ละ Code Block เพื่อนำไปใช้งานต่อใน Editor ได้สะดวก
*   **View Fullpage Preview:** สามารถเปิดดูสรุปแบบเต็มหน้าจอใน Tab ใหม่ พร้อมดีไซน์ Dark Mode ที่สวยงาม สบายตา และรองรับการสั่งพิมพ์ (Print)
*   **ปรับแต่งได้ (Customizable):** สามารถตั้งค่า Gemini API Key และเลือกรุ่นโมเดล (เช่น gemini-1.5-flash) ได้เองผ่านหน้าตั้งค่า

## การติดตั้ง (Installation)

1.  ดาวน์โหลดหรือ Clone โปรเจ็คนี้ลงในเครื่องคอมพิวเตอร์
2.  เปิด Google Chrome และไปที่ `chrome://extensions/`
3.  เปิดใช้งาน **Developer mode** (มุมขวาบน)
4.  คลิก **Load unpacked** และเลือกโฟลเดอร์ของโปรเจ็คนี้

## วิธีใช้งาน (Usage)

1.  เข้าเว็บไซต์ [Udemy](https://www.udemy.com/) และเปิดคอร์สเรียนที่ต้องการ (ต้องเป็นหน้าที่มีวิดีโอ)
2.  คลิกที่ไอคอน Extension เพื่อเปิด Side Panel
3.  **ตั้งค่าครั้งแรก:** คลิกปุ่ม Settings (รูปเฟือง) ใส่ **Gemini API Key** และกด Save
4.  **การสรุปเนื้อหา:**
    *   คลิกปุ่ม **Summarize Lecture**
    *   รอสักครู่ ระบบจะดึงคำบรรยายและให้ AI สรุปออกมา
    *   คุณสามารถเลือก **Copy to Clipboard** หรือคลิก **View Fullpage** เพื่อดูหน้าจอใหญ่ได้

## โครงสร้างไฟล์ (File Structure)

*   `manifest.json`: ไฟล์กำหนดค่าหลักของ Extension (V3)
*   `sidepanel.html/js/css`: ส่วนแสดงผลและ Logic หลักของเครื่องมือ
*   `config.json`: ไฟล์เก็บค่าตั้งค่าเริ่มต้น เช่น System Prompt และโมเดลที่ใช้
*   `background.js`: Service worker สำหรับจัดการเหตุการณ์เบื้องหลังของ Chrome

## หมายเหตุ

*   ต้องใช้งานกับวิดีโอที่มีคำบรรยาย (Subtitle/Transcript) เท่านั้น
*   API Key สามารถขอได้ฟรีที่ [Google AI Studio](https://aistudio.google.com/)

