# Hướng Dẫn Xóa File/Folder Trên GitHub

## 📋 Tổng Quan

Có **2 cách chính** để xóa file hoặc folder trên GitHub:
1. **Qua GitHub Web Interface** (Dễ nhất, phù hợp cho người mới)
2. **Qua Git Command Line** (Nhanh, phù hợp cho developer)

---

## 🌐 CÁCH 1: Xóa Qua GitHub Web Interface

### ✅ Ưu điểm:
- Dễ sử dụng, không cần biết Git command
- Trực quan, thao tác bằng chuột
- Phù hợp cho file/folder đơn lẻ

### 📝 Các bước thực hiện:

#### Bước 1: Mở GitHub Repository
1. Truy cập vào repository của bạn trên GitHub
   - Ví dụ: `https://github.com/username/repository-name`
2. Đảm bảo bạn đã đăng nhập và có quyền chỉnh sửa

#### Bước 2: Tìm file/folder cần xóa
1. Navigate đến file hoặc folder bạn muốn xóa
2. Click vào **file** để xem nội dung (nếu là file)

#### Bước 3: Xóa File
1. Click vào biểu tượng **🗑️ (trash icon)** hoặc nút **"Delete file"** ở góc trên bên phải
2. GitHub sẽ hiển thị trang để bạn xác nhận
3. Nhập commit message (ví dụ: "Delete unused file")
4. Chọn branch bạn muốn commit vào (thường là `main` hoặc `master`)
5. Click **"Commit changes"**

#### Bước 4: Xóa Folder (thông qua xóa tất cả files trong folder)
**Lưu ý:** GitHub không cho phép xóa folder trực tiếp, bạn phải:
1. Mở folder trong GitHub
2. Xóa từng file một trong folder (như Bước 3)
3. **HOẶC** sử dụng cách 2 (command line) để xóa cả folder cùng lúc

---

## 💻 CÁCH 2: Xóa Qua Git Command Line

### ✅ Ưu điểm:
- Nhanh chóng, xóa nhiều file/folder cùng lúc
- Có thể xóa cả folder và tất cả files bên trong
- Phù hợp cho developer

### 📝 Các bước thực hiện:

#### Bước 1: Mở Terminal/Command Prompt
- **Windows:** PowerShell hoặc Command Prompt
- **Mac/Linux:** Terminal

#### Bước 2: Navigate đến project folder
```bash
cd D:\SmartParking
```

#### Bước 3: Kiểm tra trạng thái Git
```bash
git status
```
- Xem file nào đã thay đổi
- Xem branch hiện tại (đảm bảo bạn đang ở branch đúng)

#### Bước 4: Xóa File

**Cách A: Xóa file từ Git và filesystem (khuyến nghị)**
```bash
git rm "path/to/file.txt"
```
- Ví dụ: `git rm "docs/old-document.md"`
- Lệnh này xóa file cả trong Git tracking VÀ trên máy tính của bạn

**Cách B: Chỉ xóa khỏi Git (giữ lại trên máy tính)**
```bash
git rm --cached "path/to/file.txt"
```
- Ví dụ: `git rm --cached "config/local.env"`
- File vẫn còn trên máy tính, nhưng Git sẽ không track nữa
- Thường dùng cho file trong `.gitignore`

#### Bước 5: Xóa Folder

**Cách A: Xóa folder và tất cả files bên trong**
```bash
git rm -r "path/to/folder"
```
- Ví dụ: `git rm -r "node_modules"`
- `-r` = recursive (xóa đệ quy, bao gồm tất cả files trong folder)
- **CẢNH BÁO:** Lệnh này sẽ xóa cả folder trên máy tính của bạn!

**Cách B: Chỉ xóa khỏi Git (giữ lại trên máy tính)**
```bash
git rm -r --cached "path/to/folder"
```
- Ví dụ: `git rm -r --cached "build/"`
- Folder vẫn còn trên máy tính, nhưng Git sẽ không track nữa

#### Bước 6: Commit thay đổi
```bash
git commit -m "Delete file/folder: description"
```
- Ví dụ: `git commit -m "Delete old documentation files"`
- Tạo commit với message mô tả rõ ràng

#### Bước 7: Push lên GitHub
```bash
git push origin main
```
- Thay `main` bằng tên branch của bạn nếu khác (có thể là `master`)
- Sau khi push, file/folder sẽ bị xóa trên GitHub

---

## 🔍 Giải Thích Chi Tiết

### 1. Git RM vs DELETE thông thường

**❌ SAI:**
```bash
# Chỉ xóa trên máy tính, không xóa khỏi Git
del file.txt        # Windows
rm file.txt         # Mac/Linux
```

**✅ ĐÚNG:**
```bash
# Xóa khỏi Git tracking
git rm file.txt
```

**Tại sao?**
- Nếu chỉ xóa bằng lệnh thông thường, file vẫn được Git track
- Khi commit, Git sẽ thấy file "missing" nhưng chưa được xác nhận xóa
- `git rm` đảm bảo Git biết bạn muốn xóa file này

### 2. Các Option của Git RM

| Option | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `git rm file.txt` | Xóa file khỏi Git và filesystem | Xóa file không cần thiết |
| `git rm --cached file.txt` | Chỉ xóa khỏi Git, giữ lại trên máy | File trong .gitignore |
| `git rm -r folder/` | Xóa folder và tất cả bên trong | Xóa thư mục cũ |
| `git rm -f file.txt` | Force delete (ngay cả khi có thay đổi chưa commit) | Xóa file đã thay đổi |

### 3. Xóa File đã bị Delete trên Filesystem

Nếu bạn đã xóa file trên máy tính (không dùng `git rm`), bạn có thể:

```bash
# Xóa tất cả files đã bị delete trên filesystem
git add -u
git commit -m "Remove deleted files"
```

Hoặc xóa từng file cụ thể:
```bash
git rm "path/to/deleted-file.txt"
git commit -m "Remove deleted file"
```

---

## 📚 Ví Dụ Thực Tế

### Ví dụ 1: Xóa một file không cần thiết
```bash
# Xóa file README cũ
git rm "docs/old-readme.md"
git commit -m "Remove outdated README file"
git push origin main
```

### Ví dụ 2: Xóa folder node_modules (không nên commit)
```bash
# Nếu node_modules đã được commit nhầm
git rm -r --cached "node_modules"
echo "node_modules/" >> .gitignore
git add .gitignore
git commit -m "Remove node_modules from Git tracking"
git push origin main
```

### Ví dụ 3: Xóa nhiều files cùng lúc
```bash
# Xóa nhiều file
git rm file1.txt file2.txt file3.txt
git commit -m "Remove unused files"
git push origin main
```

### Ví dụ 4: Xóa file trong subfolder
```bash
# Xóa file trong nested folder
git rm "server/old-script.py"
git commit -m "Remove deprecated script"
git push origin main
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Backup trước khi xóa
```bash
# Tạo branch backup trước khi xóa
git checkout -b backup-before-delete
git checkout main
# Sau đó mới xóa
```

### 2. Kiểm tra file trước khi xóa
```bash
# Xem file có quan trọng không
git log --all -- "path/to/file.txt"
git show HEAD:"path/to/file.txt"
```

### 3. Xóa file khỏi Git History (xóa vĩnh viễn)
Nếu muốn xóa hoàn toàn khỏi lịch sử Git (kể cả các commit cũ):
```bash
# CẢNH BÁO: Chỉ dùng khi thực sự cần thiết!
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/file" \
  --prune-empty --tag-name-filter cat -- --all
```
⚠️ **Rất nguy hiểm**, chỉ dùng khi cần xóa file nhạy cảm (password, API key, etc.)

### 4. Undo nếu xóa nhầm
```bash
# Khôi phục file đã xóa (trước khi commit)
git restore "path/to/file.txt"
# hoặc
git checkout HEAD -- "path/to/file.txt"

# Khôi phục sau khi đã commit
git revert HEAD
# hoặc
git checkout HEAD~1 -- "path/to/file.txt"
```

---

## 🔄 So Sánh 2 Cách

| Tiêu chí | GitHub UI | Git Command Line |
|----------|-----------|------------------|
| **Độ khó** | ⭐ Dễ | ⭐⭐⭐ Trung bình |
| **Tốc độ** | ⭐⭐ Chậm (xóa từng file) | ⭐⭐⭐ Nhanh (xóa nhiều) |
| **Xóa folder** | ❌ Không trực tiếp | ✅ Dễ dàng |
| **Phù hợp** | Người mới | Developer |
| **Cần Git knowledge** | ❌ Không | ✅ Có |

---

## ❓ Câu Hỏi Thường Gặp (FAQ)

### Q1: Xóa trên GitHub có ảnh hưởng đến files trên máy tính không?
**A:** 
- Nếu dùng GitHub UI: Không, chỉ xóa trên GitHub
- Nếu dùng `git rm` (không có `--cached`): Có, sẽ xóa cả trên máy tính
- Nếu dùng `git rm --cached`: Không, chỉ xóa khỏi Git tracking

### Q2: Có thể khôi phục file đã xóa không?
**A:** Có, file vẫn còn trong Git history. Bạn có thể:
```bash
git log --all -- "path/to/file.txt"  # Tìm commit
git checkout <commit-hash> -- "path/to/file.txt"  # Khôi phục
```

### Q3: Xóa folder có làm mất files bên trong không?
**A:** Có, `git rm -r` sẽ xóa TẤT CẢ files trong folder. Nhớ backup trước!

### Q4: Tại sao không nên commit `node_modules`?
**A:** `node_modules` rất lớn, thay đổi thường xuyên, và có thể tái tạo bằng `npm install`. Nên thêm vào `.gitignore`.

---

## 📖 Tài Liệu Tham Khảo

- [Git Documentation - git-rm](https://git-scm.com/docs/git-rm)
- [GitHub Help - Deleting files](https://docs.github.com/en/repositories/working-with-files/managing-files/deleting-files-in-a-repository)
- [Git Best Practices](https://git-scm.com/doc)

---

**Chúc bạn thành công! 🎉**

