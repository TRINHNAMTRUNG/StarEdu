# 📚 TOEIC TEST API DOCUMENTATION

## 🎯 Tổng quan
API đầy đủ để xây dựng hệ thống làm bài thi TOEIC online với giao diện giống thi thật.

---

## 📋 **STUDENT APIs** (`/api/student/tests`)

### 1. Lấy danh sách đề thi
```http
GET /api/student/tests?page=1&limit=10&year=2020&source=ETS
```
**Query Parameters:**
- `page` (optional): Số trang, mặc định 1
- `limit` (optional): Số lượng mỗi trang, mặc định 10
- `year` (optional): Lọc theo năm
- `source` (optional): Lọc theo nguồn (ETS, IIG...)

**Response:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "data": [
      {
        "_id": "674...",
        "title": "ETS 2020 Practice Test 1",
        "year": 2020,
        "source": "ETS",
        "time_limit": 120,
        "passing_score": 400,
        "is_published": true,
        "createdAt": "2024-11-23T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 2. Lấy chi tiết đề thi
```http
GET /api/student/tests/:id
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "674...",
    "title": "ETS 2020 Practice Test 1",
    "year": 2020,
    "source": "ETS",
    "audioUrl": "https://...",
    "time_limit": 120,
    "passing_score": 400,
    "parts": [
      {
        "partNumber": 1,
        "questionIds": ["674...", "675..."]
      }
    ]
  }
}
```

---

### 3. Lấy đề thi kèm câu hỏi (để làm bài)
```http
GET /api/student/tests/:id/questions?part=1
```
**Query Parameters:**
- `part` (optional): Lấy theo part cụ thể (1-7). Nếu không có thì lấy full test.

**Response khi lấy full test:**
```json
{
  "statusCode": 200,
  "data": {
    "test": {
      "_id": "674...",
      "title": "ETS 2020 Practice Test 1",
      "year": 2020,
      "source": "ETS",
      "audioUrl": "https://...",
      "time_limit": 120,
      "passing_score": 400
    },
    "parts": [
      {
        "partNumber": 1,
        "totalQuestions": 6,
        "questions": [
          {
            "_id": "674...",
            "part": 1,
            "type": "single",
            "questionNumber": 1,
            "audio": "https://...",
            "image": "https://...",
            "options": {
              "A": "A man is opening a window",
              "B": "A man is entering a room",
              "C": "A man is cleaning a window",
              "D": "A man is closing a window"
            }
          }
        ]
      }
    ],
    "totalQuestions": 200
  }
}
```

**Response khi lấy theo part:**
```json
{
  "statusCode": 200,
  "data": {
    "test": {
      "_id": "674...",
      "title": "ETS 2020 Practice Test 1",
      "audioUrl": "https://...",
      "time_limit": 120
    },
    "part": {
      "partNumber": 1,
      "totalQuestions": 6
    },
    "questions": [...]
  }
}
```

**Lưu ý:** API này **không trả về** `answer` và `explanation` để tránh gian lận.

---

### 4. Bắt đầu làm bài thi
```http
POST /api/student/tests/start
```
**Request Body:**
```json
{
  "test_id": "674..."
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Bắt đầu làm bài thi",
    "attempt": {
      "_id": "675...",
      "test_id": "674...",
      "started_at": "2024-11-23T10:00:00.000Z",
      "time_limit": 120,
      "total_questions": 200
    }
  }
}
```

**Chức năng đặc biệt:**
- Nếu user có bài thi đang làm dở (`status: "in_progress"`), API sẽ trả về bài làm dở đó thay vì tạo mới.
- Message sẽ là: `"Tiếp tục bài thi đang làm dở"`

---

### 5. Lưu câu trả lời (Realtime)
```http
POST /api/student/tests/submit-answer
```
**Request Body:**
```json
{
  "attempt_id": "675...",
  "question_id": "676...",
  "selected_answer": "B",
  "time_spent": 15
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Lưu câu trả lời thành công",
    "is_correct": true
  }
}
```

**Đặc điểm:**
- Lưu ngay lập tức khi user chọn đáp án (không đợi nộp bài)
- Tự động chấm đúng/sai
- Nếu user thay đổi đáp án, sẽ cập nhật đáp án cũ

---

### 6. Cập nhật part đang làm
```http
PUT /api/student/tests/current-part
```
**Request Body:**
```json
{
  "attempt_id": "675...",
  "part_number": 2
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Cập nhật part thành công",
    "current_part": 2
  }
}
```

**Mục đích:** Theo dõi tiến độ làm bài của user.

---

### 7. Hoàn thành và nộp bài thi
```http
POST /api/student/tests/complete
```
**Request Body:**
```json
{
  "attempt_id": "675...",
  "time_used": 115
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Hoàn thành bài thi",
    "result": {
      "attempt_id": "675...",
      "correct_answers": 145,
      "total_questions": 200,
      "listening_score": 380,
      "reading_score": 350,
      "total_score": 730,
      "time_used": 115,
      "completed_at": "2024-11-23T12:00:00.000Z"
    }
  }
}
```

**Chức năng:**
- Chuyển status từ `in_progress` → `completed`
- Tính điểm Listening (Part 1-4) và Reading (Part 5-7)
- Quy đổi sang điểm TOEIC (0-990)

---

### 8. Lấy kết quả chi tiết 1 lượt thi
```http
GET /api/student/tests/attempts/:id
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "675...",
    "test": {
      "_id": "674...",
      "title": "ETS 2020 Practice Test 1",
      "year": 2020
    },
    "started_at": "2024-11-23T10:00:00.000Z",
    "completed_at": "2024-11-23T12:00:00.000Z",
    "status": "completed",
    "answers": [
      {
        "question_id": "676...",
        "selected_answer": "B",
        "is_correct": true,
        "time_spent": 15
      }
    ],
    "listening_score": 380,
    "reading_score": 350,
    "total_score": 730,
    "correct_answers": 145,
    "total_questions": 200,
    "time_used": 115
  }
}
```

---

### 9. Lấy lịch sử làm bài
```http
GET /api/student/tests/attempts?page=1&limit=10
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "data": [
      {
        "_id": "675...",
        "test": {
          "_id": "674...",
          "title": "ETS 2020 Practice Test 1",
          "year": 2020
        },
        "started_at": "2024-11-23T10:00:00.000Z",
        "completed_at": "2024-11-23T12:00:00.000Z",
        "status": "completed",
        "total_score": 730,
        "listening_score": 380,
        "reading_score": 350
      }
    ]
  }
}
```

---

### 10. Lấy đề thi kèm đáp án (xem giải thích sau khi làm xong)
```http
GET /api/student/tests/:id/answers
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "test": {
      "_id": "674...",
      "title": "ETS 2020 Practice Test 1",
      "year": 2020
    },
    "parts": [
      {
        "partNumber": 1,
        "questions": [
          {
            "_id": "676...",
            "part": 1,
            "questionNumber": 1,
            "questionText": "Look at the picture...",
            "options": {...},
            "answer": "B",
            "explanation": "The man is entering a room, not opening or closing a window."
          }
        ]
      }
    ]
  }
}
```

**Mục đích:** Xem đáp án và giải thích sau khi hoàn thành bài thi.

---

### 11. Hủy bỏ bài thi
```http
POST /api/student/tests/abandon
```
**Request Body:**
```json
{
  "attempt_id": "675..."
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Đã hủy bài thi"
  }
}
```

**Chức năng:** Chuyển status từ `in_progress` → `abandoned`.

---

## 🔐 **ADMIN APIs** (`/api/admin/tests`)

### 1. Lấy tất cả đề thi (bao gồm chưa publish)
```http
GET /api/admin/tests?page=1&limit=10
```

### 2. Tạo đề thi mới
```http
POST /api/admin/tests
```
**Request Body:**
```json
{
  "title": "ETS 2024 Practice Test 1",
  "year": 2024,
  "source": "ETS",
  "audioUrl": "https://...",
  "time_limit": 120,
  "passing_score": 400,
  "parts": [
    {
      "partNumber": 1,
      "questionIds": ["676...", "677..."]
    }
  ]
}
```

### 3. Cập nhật đề thi
```http
PUT /api/admin/tests/:id
```

### 4. Xuất bản/Ẩn đề thi
```http
PUT /api/admin/tests/:id/publish
```
**Request Body:**
```json
{
  "is_published": true
}
```

### 5. Xóa đề thi
```http
DELETE /api/admin/tests/:id
```

---

## 🏗️ **Kiến trúc Database**

### TestAttempt Schema
```typescript
{
  user_id: ObjectId,
  test_id: ObjectId,
  started_at: Date,
  completed_at: Date,
  answers: [{
    question_id: ObjectId,
    selected_answer: String, // "A", "B", "C", "D"
    is_correct: Boolean,
    time_spent: Number
  }],
  current_part: Number, // 1-7
  status: "in_progress" | "completed" | "abandoned",
  listening_score: Number, // 0-495
  reading_score: Number, // 0-495
  total_score: Number, // 0-990
  correct_answers: Number,
  total_questions: Number,
  time_limit: Number,
  time_used: Number
}
```

---

## 🎮 **Flow làm bài thi**

### Full Test Mode:
```
1. GET /tests/:id/questions (không truyền part)
   → Lấy toàn bộ 200 câu hỏi của 7 parts
   
2. POST /tests/start
   → Tạo attempt mới
   
3. POST /tests/submit-answer (gọi realtime mỗi khi chọn đáp án)
   → Lưu từng câu trả lời
   
4. PUT /tests/current-part (khi chuyển part)
   → Cập nhật tiến độ
   
5. POST /tests/complete
   → Nộp bài và nhận kết quả
   
6. GET /tests/:id/answers
   → Xem đáp án và giải thích
```

### Practice by Part Mode:
```
1. GET /tests/:id/questions?part=1
   → Chỉ lấy câu hỏi Part 1
   
2. POST /tests/start
   
3. POST /tests/submit-answer
   
4. POST /tests/complete
   
5. GET /tests/:id/answers
```

---

## ✨ **Tính năng nổi bật**

✅ Lưu câu trả lời realtime (tránh mất dữ liệu)
✅ Tiếp tục bài thi đang làm dở
✅ Làm full test hoặc từng part
✅ Tự động chấm điểm TOEIC (Listening + Reading)
✅ Lịch sử làm bài chi tiết
✅ Xem đáp án và giải thích sau khi làm xong
✅ Theo dõi thời gian làm bài
✅ Phân quyền Admin/Student

---

## 🔒 **Authentication**

Tất cả APIs đều yêu cầu `Authorization: Bearer <token>` trong header.

Admin APIs thêm yêu cầu role `ADMIN`.

---

## 📊 **Status Codes**

- `200 OK` - Thành công
- `201 Created` - Tạo mới thành công
- `400 Bad Request` - Dữ liệu không hợp lệ
- `401 Unauthorized` - Chưa đăng nhập
- `403 Forbidden` - Không có quyền
- `404 Not Found` - Không tìm thấy
- `409 Conflict` - Xung đột dữ liệu
- `500 Internal Server Error` - Lỗi server
