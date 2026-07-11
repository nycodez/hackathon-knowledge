# Demo, answers, and access-control evidence

## Ten grounded example questions and answers

All facts below come from the Vietnamese `content_vi` field in the supplied synthetic participant workbook. The live assistant returns a citation and applies the caller's permission before retrieving source text.

| # | Question | Grounded answer | Source | Required access |
| --- | --- | --- | --- | --- |
| 1 | Chính sách thử việc là gì? | Thời gian thử việc tiêu chuẩn là 60 ngày lịch. | DOC001 | Public |
| 2 | Nhân viên được bao nhiêu ngày nghỉ phép năm? | Nhân viên chính thức có 15 ngày nghỉ phép năm có lương sau khi hoàn thành thử việc. | DOC002 | Internal |
| 3 | Cần làm gì trước khi đặt chuyến công tác? | Quản lý trực tiếp phải phê duyệt trước khi đặt vé hoặc khách sạn. | DOC003 | Internal |
| 4 | Chi phí của nhân viên được hoàn ứng như thế nào? | Nộp trong hệ thống trong 10 ngày làm việc; khoản trên 200.000 VND cần hóa đơn hoặc chứng từ hợp lệ. | DOC011 | Internal |
| 5 | Khung lương Product Manager là bao nhiêu? | Dải tham khảo là 35.000.000–60.000.000 VND/tháng tùy cấp độ và kinh nghiệm. | DOC007 | HR or Executive |
| 6 | SLA mục tiêu cho dịch vụ quan trọng là bao nhiêu? | Mục tiêu là 99,5% và phải có dashboard theo dõi. | DOC027 | Operations or Executive |
| 7 | Dữ liệu cá nhân phải được xử lý như thế nào? | Cần cơ sở pháp lý phù hợp hoặc sự đồng ý và chỉ thu thập dữ liệu cần thiết cho mục đích đã thông báo. | DOC031 | Internal |
| 8 | Restricted nghĩa là loại thông tin như thế nào? | Đây là thông tin nhạy cảm cao, chỉ dành cho Ban Điều hành hoặc người được ủy quyền. | DOC034 | Internal |
| 9 | Ưu tiên chiến lược của công ty năm 2026 là gì? | Mở rộng hệ sinh thái số, tăng trưởng dịch vụ giá trị gia tăng và nâng cao năng lực AI nội bộ. | DOC036 | Executive |
| 10 | Kế hoạch M&A năm nay có gì? | Kế hoạch tập trung vào công ty có năng lực dữ liệu, AI hoặc dịch vụ số bổ trợ. | DOC039 | Executive |

## Access-control enforcement

The browser may select a demo `userId`, but it cannot submit a role, department, or subsidiary claim. The API resolves those attributes from `tasco_users`, then applies the following SQL predicates before lexical ranking, vector ranking, citation construction, or model-context assembly:

| Classification | Employee / Manager / Director | Executive |
| --- | --- | --- |
| Public | Allow in the same subsidiary | Allow in the same subsidiary |
| Internal | Allow in the same subsidiary | Allow in the same subsidiary |
| Confidential | Allow only for the owning department | Allow across departments |
| Restricted | Deny | Allow |

Every query also requires `source.subsidiary_id = principal.subsidiary_id`. A denial returns no protected content, chunk identifier, citation, preview, or protected candidate count. The decision and enforcement point are written to the append-only retrieval audit log without storing the protected passage.

The `/mytasco/v1` facade is intentionally a deterministic mock for Flutter integration. It validates `X-App-Code: MYTASCO`, uses the COP envelope, echoes `X-Request-Id`, and accepts optional `demo-U001`–`demo-U032` Bearer tokens. Those tokens are not production authentication.

## Permission test cases

| Case | User | Source | Expected | Rule exercised |
| --- | --- | --- | --- | --- |
| T1 | U003 Product Director | DOC036 Restricted | Deny | Restricted is Executive-only |
| T2 | U007 Executive | DOC036 Restricted | Allow | Executive access to Restricted |
| T3 | U004 Engineering Employee | DOC007 HR Confidential | Deny | Confidential cross-department block |
| T4 | U001 HR Employee | DOC007 HR Confidential | Allow | Confidential own-department access |
| T5 | U002 Finance Manager | DOC002 Internal | Allow | Internal is available to all internal roles |
| T6 | U003 Product Director | DOC034 Legal Internal | Allow | Internal does not impose a department restriction |
| T7 | U001 HR Employee | DOC001 Public | Allow | Public is available to all canonical users |
| T8 | U010 DNP Water user | TLD001 foreign-subsidiary Internal | Deny | Subsidiary isolation precedes classification |

The public workbook evaluation adds 50 question/user/source combinations. The release gate is at least 48/50 correct decisions, all eight explicit permission tests passing, and zero unauthorized chunks or citations.

## Data provenance

- `ai_workspace_dataset_vietnamese_participants.xlsm`: canonical synthetic documents, metadata, departments, users, roles, permissions, and 50 public evaluation prompts.
- `ai_workspace_mytasco_api_documentation.pdf` (version 2026-06-26): COP headers/envelope, staff and organization DTOs, compatibility requirements, and submission artifact requirements.
- `TLD001` and `TLU001`: locally generated, clearly labelled isolation records used only to demonstrate a second subsidiary boundary; they are not challenge-provided examples.

The normalized TypeScript fixtures retain stable IDs, Vietnamese diacritics, full `content_vi`, owner/access metadata, dates, tags, language, and workbook word counts. During integration, a source-integrity check compared all 40 document contents, 32 identities, and 50 public evaluation rows against the supplied workbook.
