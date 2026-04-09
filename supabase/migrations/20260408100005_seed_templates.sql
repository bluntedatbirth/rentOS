-- Seed 4 built-in Thai rental contract templates
-- All templates are bilingual (Thai legal text followed by English translation per clause)

INSERT INTO contract_templates (name_en, name_th, description_en, description_th, category, is_system, landlord_id, template_text) VALUES

-- ─── 1. Standard Residential ────────────────────────────────────────────────
(
  'Standard Residential Lease',
  'สัญญาเช่าที่พักอาศัยมาตรฐาน',
  '12-month residential lease with standard Thai legal terms. Covers all mandatory clauses per OCPB 2025 regulation. Suitable for houses and apartments.',
  'สัญญาเช่าที่พักอาศัย 12 เดือนตามมาตรฐานกฎหมายไทย ครอบคลุมข้อสัญญาบังคับตามประกาศ สคบ. พ.ศ. 2568 เหมาะสำหรับบ้านและอพาร์ตเมนต์',
  'residential',
  true,
  null,
  $TEMPLATE$
สัญญาเช่าที่พักอาศัย
RESIDENTIAL LEASE AGREEMENT

ทำขึ้น ณ ____________________  วันที่ ____________________ เดือน ____________________ พ.ศ. ____________________
Made at ____________________ on ____________________

คู่สัญญา / PARTIES

ผู้ให้เช่า (Landlord): ____________________  เลขที่บัตร (ID): ____________________
ผู้เช่า (Tenant): ____________________  เลขที่บัตร (ID): ____________________

ทรัพย์สินที่เช่า / LEASED PREMISES: ____________________

1. วัตถุประสงค์การเช่า / PURPOSE OF LEASE
ผู้ให้เช่าตกลงให้ผู้เช่าเช่าทรัพย์สินข้างต้นเพื่อใช้เป็นที่พักอาศัยส่วนตัวเท่านั้น
The Landlord agrees to lease the above premises to the Tenant for residential purposes only.

2. ระยะเวลาเช่า / LEASE TERM
ระยะเวลาเช่า 12 เดือน ตั้งแต่วันที่ ____________________ ถึงวันที่ ____________________
Lease term: 12 months, from ____________________ to ____________________.

3. ค่าเช่า / RENT
ค่าเช่ารายเดือน ____________________  บาท ชำระภายในวันที่ ____________________ ของทุกเดือน
Monthly rent: ____________________  THB, due on the ____________________ of each month.
ชำระโดยโอนเงินเข้าบัญชี: ธนาคาร ____________________ ชื่อบัญชี ____________________ เลขที่บัญชี ____________________
Payment to bank account: Bank ____________________ Account Name ____________________ Account No. ____________________

4. เงินประกัน / SECURITY DEPOSIT
ผู้เช่าชำระเงินประกัน ____________________  บาท ณ วันทำสัญญา ผู้ให้เช่าต้องคืนเงินภายใน 7 วัน (กรณีไม่มีความเสียหาย) หรือ 14 วัน (พร้อมรายการหักโดยละเอียด) นับแต่วันสิ้นสุดสัญญา
Tenant pays a security deposit of ____________________  THB on execution. Landlord must return within 7 days (no damage) or 14 days (with itemized deductions) after lease end.

5. ค่าสาธารณูปโภค / UTILITIES
ค่าไฟฟ้าและน้ำประปาคิดตามอัตราของการไฟฟ้า/ประปาเท่านั้น ห้ามเรียกเก็บเกินอัตราดังกล่าว
Electricity and water are charged at the official MEA/PEA/PWA tariff rates only. Surcharges above government rates are prohibited.

6. การบำรุงรักษา / MAINTENANCE
ผู้ให้เช่ารับผิดชอบ: โครงสร้างอาคาร ระบบประปาและไฟฟ้า พื้นที่ส่วนกลาง กำจัดแมลง
Landlord responsibilities: structural repairs, plumbing and electrical systems, common areas, pest control.
ผู้เช่ารับผิดชอบ: ทำความสะอาดประจำวัน ซ่อมแซมเล็กน้อย ดูแลเครื่องใช้ไฟฟ้า แจ้งความเสียหาย
Tenant responsibilities: daily cleaning, minor repairs, appliance care, reporting damage.
ผู้ให้เช่าต้องดำเนินการซ่อมแซมภายใน ____________________ วันทำการ ฉุกเฉิน ติดต่อ: ____________________
Landlord must respond to repair requests within ____________________ business days. Emergency contact: ____________________

7. กฎการอยู่อาศัย / HOUSE RULES
- สัตว์เลี้ยง: ____________________  / Pets: ____________________
- การให้เช่าช่วง: ไม่อนุญาตโดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษร / Subletting: Not permitted without written consent
- สูบบุหรี่: ____________________  / Smoking: ____________________
- เวลาเงียบ: 22:00–06:00 น. / Quiet Hours: 22:00–06:00

8. การบอกเลิกสัญญา / TERMINATION
ผู้เช่าต้องแจ้งล่วงหน้าอย่างน้อย 30 วันเป็นลายลักษณ์อักษร
Tenant must give at least 30 days written notice.
การบอกเลิกก่อนกำหนด: ค่าปรับ ____________________ เดือน ของค่าเช่า
Early termination penalty: ____________________ month(s) rent.

9. สิทธิผู้เช่าที่ไม่สามารถสละได้ตามประกาศ สคบ. พ.ศ. 2568 / NON-WAIVABLE TENANT RIGHTS (OCPB 2025)
ก. ผู้เช่ามีสิทธิบอกเลิกสัญญาด้วยการแจ้งล่วงหน้า 30 วัน หลังจากอยู่อาศัยครบ 50% ของระยะเวลาเช่า
   (a) Tenant may terminate with 30-day written notice after occupying 50% of the lease term.
ข. ผู้ให้เช่าไม่มีสิทธิปิดกั้นการเข้าถึงหรือยึดทรัพย์สินโดยปราศจากคำสั่งศาล
   (b) Landlord may not lock out Tenant or seize property without court order.
ค. ผู้ให้เช่าต้องส่งใบแจ้งค่าเช่าล่วงหน้าอย่างน้อย 3 วัน
   (c) Landlord must provide written invoice at least 3 days before payment due date.

10. การตรวจสอบสภาพห้องเมื่อย้ายเข้า / MOVE-IN CONDITION INSPECTION
ทั้งสองฝ่ายต้องตรวจสอบและลงนามในรายงานสภาพห้องก่อนผู้เช่าย้ายเข้า
Both parties must inspect and sign a property condition report before move-in.

11. การต่อสัญญา / RENEWAL
สัญญานี้จะต่ออายุโดยอัตโนมัติหากไม่มีฝ่ายใดแจ้งยกเลิกล่วงหน้า ____________________ วัน ก่อนสิ้นสุดสัญญา
This lease auto-renews unless either party gives ____________________ days notice before expiry.

12. เหตุสุดวิสัย / FORCE MAJEURE
หากเหตุการณ์ใดๆ ที่อยู่นอกเหนือการควบคุมทำให้ไม่สามารถปฏิบัติตามสัญญาได้ ทั้งสองฝ่ายจะปรึกษาหารือเพื่อหาทางออกที่เป็นธรรม อ้างอิงประมวลกฎหมายแพ่งและพาณิชย์มาตรา 219
If either party is prevented from performing by events beyond their control, both parties shall negotiate a fair resolution. Ref: Thai Civil and Commercial Code Section 219.

13. การระงับข้อพิพาท / DISPUTE RESOLUTION
ข้อพิพาทให้ระงับโดย ____________________  โดยอยู่ภายใต้กฎหมายไทย
Disputes shall be resolved by ____________________ under Thai law.

14. กฎหมายที่ใช้บังคับ / GOVERNING LAW
สัญญานี้อยู่ภายใต้ประมวลกฎหมายแพ่งและพาณิชย์ หมวด 6 ว่าด้วยการเช่าทรัพย์ (มาตรา 537–571) และกฎหมายไทยที่เกี่ยวข้อง
This agreement is governed by the Thai Civil and Commercial Code Book III Title VI (Sections 537–571) and applicable Thai law.

15. ข้อตกลงทั้งหมด / ENTIRE AGREEMENT
สัญญาฉบับนี้ถือเป็นข้อตกลงทั้งหมดระหว่างคู่สัญญา การแก้ไขใดๆ ต้องทำเป็นลายลักษณ์อักษรและลงนามโดยทั้งสองฝ่าย
This agreement constitutes the entire agreement. Amendments must be in writing and signed by both parties.

ลงนาม / SIGNATURES

ผู้ให้เช่า / Landlord: ____________________  วันที่ / Date: ____________________
ผู้เช่า / Tenant: ____________________  วันที่ / Date: ____________________
พยาน / Witness 1: ____________________  วันที่ / Date: ____________________
พยาน / Witness 2: ____________________  วันที่ / Date: ____________________
$TEMPLATE$
),

-- ─── 2. Condo Rental ─────────────────────────────────────────────────────────
(
  'Condominium Rental Agreement',
  'สัญญาเช่าคอนโดมิเนียม',
  'Designed for condominium units. Includes juristic person rules, common area usage, building regulations compliance, and references to the Condominium Act B.E. 2522.',
  'ออกแบบสำหรับห้องชุดคอนโดมิเนียม รวมถึงข้อกำหนดของนิติบุคคล การใช้พื้นที่ส่วนกลาง และการปฏิบัติตาม พ.ร.บ. อาคารชุด พ.ศ. 2522',
  'condo',
  true,
  null,
  $TEMPLATE$
สัญญาเช่าห้องชุดคอนโดมิเนียม
CONDOMINIUM UNIT LEASE AGREEMENT

ทำขึ้น ณ ____________________  วันที่ ____________________ เดือน ____________________ พ.ศ. ____________________
Made at ____________________ on ____________________

คู่สัญญา / PARTIES

ผู้ให้เช่า (Landlord): ____________________  เลขที่บัตร (ID): ____________________
ผู้เช่า (Tenant): ____________________  เลขที่บัตร (ID): ____________________

ห้องชุดที่เช่า / LEASED UNIT: ห้อง ____________________ ชั้น ____________________ อาคาร ____________________
ที่อยู่ / Address: ____________________

1. วัตถุประสงค์การเช่า / PURPOSE OF LEASE
ผู้ให้เช่าตกลงให้ผู้เช่าเช่าห้องชุดดังกล่าวเพื่อใช้เป็นที่พักอาศัยส่วนตัวเท่านั้น สัญญานี้อยู่ภายใต้ประมวลกฎหมายแพ่งและพาณิชย์และพระราชบัญญัติอาคารชุด พ.ศ. 2522
Landlord leases the above unit for residential use only. This agreement is governed by the Civil and Commercial Code and Condominium Act B.E. 2522.

2. ระยะเวลาเช่า / LEASE TERM
____________________  เดือน ตั้งแต่ ____________________ ถึง ____________________
____________________ months, from ____________________ to ____________________.

3. ค่าเช่า / RENT
ค่าเช่ารายเดือน ____________________  บาท ชำระภายในวันที่ ____________________ ของทุกเดือน
Monthly rent: ____________________  THB, due on ____________________ of each month.
ชำระโดยโอนเงินเข้าบัญชี: ธนาคาร ____________________ ชื่อบัญชี ____________________ เลขที่บัญชี ____________________
Payment to: Bank ____________________ Account Name ____________________ Account No. ____________________

4. เงินประกัน / SECURITY DEPOSIT
เงินประกัน ____________________  บาท คืนภายใน 7 วัน (ไม่มีความเสียหาย) หรือ 14 วัน (พร้อมรายการหัก) หลังสิ้นสุดสัญญา
Security deposit: ____________________  THB. Returned within 7 days (no damage) or 14 days (itemized deductions) after lease end.

5. ค่าส่วนกลางและค่าบำรุงรักษาอาคาร / COMMON AREA FEE & MAINTENANCE FEE
ค่าส่วนกลางเป็นความรับผิดชอบของ: ผู้ให้เช่า / ผู้เช่า (วงกลมที่เกี่ยวข้อง) จำนวน ____________________  บาท/เดือน
Common area fee is payable by: Landlord / Tenant (circle applicable): ____________________  THB/month.

6. กฎระเบียบนิติบุคคลอาคารชุด / JURISTIC PERSON REGULATIONS
ผู้เช่าต้องปฏิบัติตามระเบียบข้อบังคับของนิติบุคคลอาคารชุด ____________________ รวมถึงกฎระเบียบอาคาร ชั่วโมงเงียบ และการใช้สิ่งอำนวยความสะดวกส่วนกลาง ผู้เช่าต้องลงทะเบียนกับนิติบุคคลในวันย้ายเข้า
Tenant must comply with the regulations of ____________________ Condominium Juristic Person including building rules, quiet hours, and common area usage. Tenant must register with the juristic person office on move-in day.

7. ข้อห้ามสำหรับคอนโดมิเนียม / CONDOMINIUM PROHIBITIONS
ก. ห้ามให้เช่าช่วงระยะสั้น (ต่ำกว่า 30 วัน) เว้นแต่อาคารจะได้รับใบอนุญาตโรงแรม ตาม พ.ร.บ. อาคารชุด มาตรา 17/1
   (a) Short-term rentals under 30 days are prohibited unless the building holds a hotel license (Condominium Act S.17/1).
ข. ห้ามดัดแปลงโครงสร้างโดยไม่ได้รับอนุญาตจากนิติบุคคลและผู้ให้เช่า
   (b) Structural alterations require written approval from both the juristic person and landlord.

8. ค่าสาธารณูปโภค / UTILITIES
คิดตามอัตราการไฟฟ้า/ประปาอย่างเป็นทางการเท่านั้น
Charged at official MEA/PEA/PWA rates only. No surcharges permitted.

9. การบำรุงรักษา / MAINTENANCE
ผู้ให้เช่า: โครงสร้าง ระบบท่อและไฟฟ้าภายในห้องชุด เครื่องปรับอากาศ (ชิ้นส่วนหลัก)
Landlord: structure, in-unit plumbing/electrical, air-conditioning (major components).
ผู้เช่า: ทำความสะอาด ซ่อมแซมเล็กน้อย ดูแลเครื่องปรับอากาศ (ล้างทำความสะอาดกรอง) แจ้งความเสียหาย
Tenant: cleaning, minor repairs, AC filter cleaning, damage reporting.

10. สิทธิผู้เช่าที่ไม่สามารถสละได้ / NON-WAIVABLE TENANT RIGHTS (OCPB 2025)
ก. บอกเลิกสัญญาล่วงหน้า 30 วัน หลังอยู่ครบ 50% ของระยะเวลาเช่า
   (a) Terminate with 30-day notice after 50% of lease term has elapsed.
ข. ห้ามปิดกั้นการเข้าถึงโดยไม่มีคำสั่งศาล
   (b) No lockout or property seizure without court order.

11. การตรวจสอบสภาพห้องเมื่อย้ายเข้า-ออก / MOVE-IN/OUT INSPECTION
ทั้งสองฝ่ายลงนามในรายงานสภาพห้องเมื่อย้ายเข้าและย้ายออก
Both parties sign a condition report at move-in and move-out.

12. การต่ออายุสัญญา / RENEWAL
ต่ออายุอัตโนมัติ ____________________ เดือน เว้นแต่จะแจ้งยกเลิกล่วงหน้า ____________________ วัน อ้างอิงประมวลกฎหมายแพ่งมาตรา 570
Auto-renews for ____________________ months unless ____________________ days notice given. Ref: CCC Section 570.

13. การระงับข้อพิพาท / DISPUTE RESOLUTION
____________________  ภายใต้กฎหมายไทย / ____________________ under Thai law.

14. กฎหมายที่ใช้บังคับ / GOVERNING LAW
ประมวลกฎหมายแพ่งและพาณิชย์ หมวด 6 (มาตรา 537–571) และ พ.ร.บ. อาคารชุด พ.ศ. 2522
Thai CCC Book III Title VI (S.537–571) and Condominium Act B.E. 2522.

ลงนาม / SIGNATURES

ผู้ให้เช่า / Landlord: ____________________  วันที่ / Date: ____________________
ผู้เช่า / Tenant: ____________________  วันที่ / Date: ____________________
พยาน / Witness 1: ____________________  วันที่ / Date: ____________________
พยาน / Witness 2: ____________________  วันที่ / Date: ____________________
$TEMPLATE$
),

-- ─── 3. Furnished Property ───────────────────────────────────────────────────
(
  'Furnished Property Lease',
  'สัญญาเช่าที่พักพร้อมเฟอร์นิเจอร์',
  'Includes a detailed furniture and appliance inventory checklist, damage assessment terms, and replacement cost schedule. Ideal for fully-furnished units.',
  'รวมรายการสิ่งของและเครื่องใช้พร้อมเงื่อนไขประเมินความเสียหายและค่าใช้จ่ายทดแทน เหมาะสำหรับที่พักที่มีเฟอร์นิเจอร์ครบครัน',
  'furnished',
  true,
  null,
  $TEMPLATE$
สัญญาเช่าที่พักพร้อมเฟอร์นิเจอร์
FURNISHED PROPERTY LEASE AGREEMENT

ทำขึ้น ณ ____________________  วันที่ ____________________ เดือน ____________________ พ.ศ. ____________________
Made at ____________________ on ____________________

คู่สัญญา / PARTIES

ผู้ให้เช่า (Landlord): ____________________  เลขที่บัตร (ID): ____________________
ผู้เช่า (Tenant): ____________________  เลขที่บัตร (ID): ____________________

ที่พักที่เช่า / LEASED PREMISES: ____________________

1. วัตถุประสงค์การเช่า / PURPOSE OF LEASE
เช่าเพื่อใช้เป็นที่พักอาศัยส่วนตัวพร้อมเฟอร์นิเจอร์และเครื่องใช้ไฟฟ้าตามรายการแนบ
Leased for residential use including furniture and appliances as listed in Schedule A attached.

2. ระยะเวลาเช่า / LEASE TERM
____________________  เดือน ตั้งแต่ ____________________ ถึง ____________________
____________________ months, from ____________________ to ____________________.

3. ค่าเช่า / RENT
ค่าเช่ารายเดือน ____________________  บาท (รวมค่าเช่าเฟอร์นิเจอร์)
Monthly rent: ____________________  THB (inclusive of furniture rental).

4. เงินประกัน / SECURITY DEPOSIT
เงินประกัน ____________________  บาท ครอบคลุมทั้งทรัพย์สินและเฟอร์นิเจอร์
Security deposit: ____________________  THB covering both property and furnishings.
คืนภายใน 7 วัน (ไม่มีความเสียหาย) หรือ 14 วัน (พร้อมรายการหักโดยละเอียด)
Returned within 7 days (no damage) or 14 days (itemized deductions) after lease end.

5. รายการสิ่งของและเครื่องใช้ (ภาคผนวก ก) / FURNITURE & APPLIANCE INVENTORY (SCHEDULE A)
รายการต่อไปนี้มีอยู่ในที่พัก ณ วันเริ่มสัญญา ทั้งสองฝ่ายตกลงตรวจสอบและลงนามรับรองรายการก่อนผู้เช่าย้ายเข้า:
The following items are present at commencement. Both parties agree to inspect and sign off before move-in:

ห้องนอน / Bedroom:
☐ เตียง / Bed (____________________) ☐ ตู้เสื้อผ้า / Wardrobe (____________________) ☐ โต๊ะ / Desk (____________________) ☐ เก้าอี้ / Chair (____________________)

ห้องนั่งเล่น / Living Room:
☐ โซฟา / Sofa (____________________) ☐ โต๊ะกลาง / Coffee Table (____________________) ☐ โทรทัศน์ / TV (____________________)  นิ้ว / inch ☐ เครื่องรับสัญญาณ / Receiver (____________________)

ห้องครัว / Kitchen:
☐ ตู้เย็น / Refrigerator (____________________) ☐ เตาไฟฟ้า/แก๊ส / Stove (____________________) ☐ เครื่องดูดควัน / Hood (____________________)

อุปกรณ์ / Appliances:
☐ เครื่องซักผ้า / Washing Machine (____________________) ☐ เครื่องปรับอากาศ / Air Conditioner (____________________  BTU) ☐ เครื่องทำน้ำอุ่น / Water Heater (____________________)

6. เงื่อนไขการประเมินความเสียหายเฟอร์นิเจอร์ / FURNITURE DAMAGE ASSESSMENT
ความเสียหายอันเกิดจากการใช้งานตามปกติ (wear and tear) ไม่ถือเป็นความรับผิดชอบของผู้เช่า ความเสียหายที่เกิดจากการใช้งานผิดวิธีหรือความประมาทเลินเล่อของผู้เช่าจะถูกหักจากเงินประกัน โดยประเมินตามมูลค่าทดแทนในตลาด ณ เวลาที่เกิดความเสียหาย
Normal wear and tear is not the Tenant's liability. Damage caused by misuse or negligence will be deducted from the deposit based on current market replacement value at the time of damage.

7. ค่าสาธารณูปโภค / UTILITIES
คิดตามอัตราทางการของ กฟน./กฟภ./กปน. เท่านั้น
Charged at official MEA/PEA/PWA rates only.

8. การดูแลรักษาเฟอร์นิเจอร์ / FURNITURE CARE
ผู้เช่าต้องดูแลเฟอร์นิเจอร์และเครื่องใช้ไฟฟ้าด้วยความระมัดระวัง ใช้งานตามวัตถุประสงค์ที่ตั้งใจเท่านั้น และแจ้งให้ผู้ให้เช่าทราบทันทีเมื่อเกิดการชำรุด
Tenant must maintain all furnishings carefully, use them only for their intended purpose, and notify the Landlord immediately of any breakdown or damage.

9. การห้ามเคลื่อนย้ายเฟอร์นิเจอร์ / FURNITURE REMOVAL
ผู้เช่าห้ามนำเฟอร์นิเจอร์ออกจากที่พักโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรจากผู้ให้เช่า
Tenant may not remove any furniture from the premises without written permission from the Landlord.

10. สิทธิผู้เช่าที่ไม่สามารถสละได้ / NON-WAIVABLE TENANT RIGHTS (OCPB 2025)
ก. บอกเลิกสัญญาล่วงหน้า 30 วัน หลังอยู่ครบ 50% ของระยะเวลาเช่า
   (a) Terminate with 30-day notice after 50% of lease term.
ข. ห้ามปิดกั้นการเข้าถึงโดยไม่มีคำสั่งศาล
   (b) No lockout or seizure without court order.

11. การบอกเลิกสัญญา / TERMINATION
แจ้งล่วงหน้า ____________________ วัน ค่าปรับบอกเลิกก่อนกำหนด: ____________________ เดือนค่าเช่า
____________________ days notice required. Early termination penalty: ____________________ month(s) rent.

12. การตรวจสอบสภาพ / CONDITION INSPECTION
ทั้งสองฝ่ายตรวจสอบและลงนามในรายการสิ่งของ (ภาคผนวก ก) ทั้งเมื่อย้ายเข้าและย้ายออก
Both parties inspect and sign Schedule A at move-in and move-out.

13. กฎหมายที่ใช้บังคับ / GOVERNING LAW
ประมวลกฎหมายแพ่งและพาณิชย์ หมวด 6 (มาตรา 537–571) / Thai CCC Book III Title VI (S.537–571).

ลงนาม / SIGNATURES

ผู้ให้เช่า / Landlord: ____________________  วันที่ / Date: ____________________
ผู้เช่า / Tenant: ____________________  วันที่ / Date: ____________________
พยาน / Witness 1: ____________________  วันที่ / Date: ____________________
พยาน / Witness 2: ____________________  วันที่ / Date: ____________________
$TEMPLATE$
),

-- ─── 4. Short-Term Rental ────────────────────────────────────────────────────
(
  'Short-Term Rental Agreement',
  'สัญญาเช่าระยะสั้น',
  '1–6 month terms with flexible termination provisions, different deposit structure, and terms suitable for temporary accommodation. Includes OCPB-compliant clauses.',
  'ระยะเวลา 1–6 เดือน พร้อมเงื่อนไขการบอกเลิกที่ยืดหยุ่น โครงสร้างเงินประกันที่แตกต่าง และข้อสัญญาตามมาตรฐาน สคบ.',
  'short_term',
  true,
  null,
  $TEMPLATE$
สัญญาเช่าที่พักระยะสั้น
SHORT-TERM RENTAL AGREEMENT

ทำขึ้น ณ ____________________  วันที่ ____________________ เดือน ____________________ พ.ศ. ____________________
Made at ____________________ on ____________________

คู่สัญญา / PARTIES

ผู้ให้เช่า (Landlord): ____________________  เลขที่บัตร (ID): ____________________
ผู้เช่า (Tenant): ____________________  เลขที่บัตร (ID): ____________________

ที่พักที่เช่า / LEASED PREMISES: ____________________

1. วัตถุประสงค์การเช่า / PURPOSE OF LEASE
เช่าเพื่อใช้เป็นที่พักอาศัยชั่วคราวเท่านั้น ระยะสั้น 1–6 เดือน
Leased for temporary residential accommodation only, short-term 1–6 months.

2. ระยะเวลาเช่า / LEASE TERM
____________________  เดือน ตั้งแต่ ____________________ ถึง ____________________  (ไม่เกิน 6 เดือน)
____________________ months, from ____________________ to ____________________ (maximum 6 months).

3. ค่าเช่า / RENT
ค่าเช่ารายเดือน ____________________  บาท ชำระล่วงหน้าในวันที่ ____________________ ของแต่ละเดือน
Monthly rent: ____________________  THB, paid in advance on the ____________________ of each month.
ชำระโดยโอนเงินเข้าบัญชี: ธนาคาร ____________________ ชื่อบัญชี ____________________ เลขที่บัญชี ____________________
Payment to: Bank ____________________ Account Name ____________________ Account No. ____________________

4. โครงสร้างเงินประกันระยะสั้น / SHORT-TERM DEPOSIT STRUCTURE
เงินประกัน ____________________  บาท (เทียบเท่า ____________________ เดือนค่าเช่า) ชำระ ณ วันทำสัญญา
Security deposit: ____________________  THB (equivalent to ____________________ month(s) rent), payable on execution.
เงินมัดจำจอง (ถ้ามี): ____________________  บาท จะนำมาหักออกจากเงินประกัน ณ วันย้ายเข้า
Booking deposit (if any): ____________________  THB, to be deducted from security deposit at move-in.
คืนเงินประกันภายใน 7 วัน (ไม่มีความเสียหาย) หรือ 14 วัน (พร้อมรายการหัก) หลังสิ้นสุดสัญญา
Deposit returned within 7 days (no damage) or 14 days (itemized deductions) after lease end.

5. ค่าสาธารณูปโภค / UTILITIES
คิดตามอัตราทางการของ กฟน./กฟภ./กปน. เท่านั้น ห้ามบวกเพิ่มใดๆ
Charged at official MEA/PEA/PWA rates only. No surcharges permitted.

6. เงื่อนไขการบอกเลิกสัญญาที่ยืดหยุ่น / FLEXIBLE TERMINATION TERMS
ผู้เช่าสามารถบอกเลิกสัญญาได้โดยแจ้งล่วงหน้า ____________________ วัน เป็นลายลักษณ์อักษร
Tenant may terminate with ____________________ days written notice.
ค่าปรับการบอกเลิกก่อนกำหนด: ____________________  บาท หรือ ____________________ เดือนค่าเช่า (แล้วแต่จำนวนใดน้อยกว่า)
Early termination fee: ____________________  THB or ____________________ month(s) rent (whichever is less).
สิทธิตาม สคบ.: ผู้เช่ามีสิทธิบอกเลิกสัญญาล่วงหน้า 30 วัน หลังอยู่ครบ 50% ของระยะเวลาเช่า
OCPB right: Tenant may terminate with 30-day notice after 50% of lease term without penalty.

7. สิทธิผู้ให้เช่าในการบอกเลิก / LANDLORD TERMINATION RIGHTS
ผู้ให้เช่าสามารถบอกเลิกสัญญาได้โดยแจ้งล่วงหน้า ____________________ วัน เป็นลายลักษณ์อักษร กรณีผู้เช่าผิดนัดชำระหรือละเมิดสัญญาร้ายแรง
Landlord may terminate with ____________________ days written notice for material breach or non-payment.

8. กฎการอยู่อาศัย / HOUSE RULES
- จำนวนผู้พักอาศัยสูงสุด / Maximum occupants: ____________________  คน/persons
- ห้ามจัดงานปาร์ตี้หรืองานเลี้ยงขนาดใหญ่ / No large parties or gatherings
- สัตว์เลี้ยง / Pets: ____________________
- สูบบุหรี่ / Smoking: ____________________
- เวลาเงียบ / Quiet hours: 22:00–07:00 น./hrs

9. ค่าเช่าค้างชำระ / LATE PAYMENT
ค่าปรับ ____________________  % ต่อวันของยอดค้างชำระ หลังเกินกำหนด ____________________ วัน
Late fee: ____________________  % per day on overdue amount after ____________________ days grace period.

10. การบำรุงรักษา / MAINTENANCE
ผู้ให้เช่า: โครงสร้าง ระบบท่อและไฟฟ้าหลัก ติดต่อฉุกเฉิน: ____________________
Landlord: structure, major systems. Emergency contact: ____________________.
ผู้เช่า: ทำความสะอาด รายงานความเสียหายภายใน 24 ชั่วโมง
Tenant: cleaning, report damage within 24 hours.

11. สิทธิผู้เช่าที่ไม่สามารถสละได้ / NON-WAIVABLE TENANT RIGHTS (OCPB 2025)
ก. บอกเลิกสัญญาล่วงหน้า 30 วัน หลังอยู่ครบ 50% ของระยะเวลาเช่า / Terminate with 30-day notice after 50% of term.
ข. ค่าสาธารณูปโภคตามอัตราทางการเท่านั้น / Utilities at official rates only.
ค. ห้ามปิดกั้นการเข้าถึงโดยไม่มีคำสั่งศาล / No lockout without court order.

12. การตรวจสอบสภาพ / CONDITION INSPECTION
ทั้งสองฝ่ายตรวจสอบและลงนามในรายงานสภาพห้องเมื่อย้ายเข้าและย้ายออก
Both parties inspect and sign condition report at move-in and move-out.

13. เหตุสุดวิสัย / FORCE MAJEURE
อ้างอิงประมวลกฎหมายแพ่งและพาณิชย์มาตรา 219
Ref: Thai CCC Section 219.

14. กฎหมายที่ใช้บังคับ / GOVERNING LAW
ประมวลกฎหมายแพ่งและพาณิชย์ หมวด 6 (มาตรา 537–571) / Thai CCC Book III Title VI (S.537–571).

ลงนาม / SIGNATURES

ผู้ให้เช่า / Landlord: ____________________  วันที่ / Date: ____________________
ผู้เช่า / Tenant: ____________________  วันที่ / Date: ____________________
พยาน / Witness 1: ____________________  วันที่ / Date: ____________________
พยาน / Witness 2: ____________________  วันที่ / Date: ____________________
$TEMPLATE$
);
