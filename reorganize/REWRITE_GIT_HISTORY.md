# 📝 Hướng Dẫn Rewrite Git History - Từng Bước

## 🎯 Mục tiêu

Rewrite lại toàn bộ git history với commit messages đúng:
- `docs/` → "Documents"
- `frontend/` → "frontend"
- `reorganize/` → "reorganize instruction"
- `scripts/` → "scripts"
- `.gitignore` → "gitignore"
- `package-lock.json` → "package-lock"
- `package.json` → "package"
- `README.md` → "README"

---

## ⚠️ LƯU Ý QUAN TRỌNG TRƯỚC KHI BẮT ĐẦU

1. **Backup toàn bộ project**: Copy folder `D:\SmartParking` sang `D:\SmartParking_backup_git`
2. **Kiểm tra không có thay đổi chưa commit**: `git status` phải clean
3. **Đảm bảo đang ở đúng nơi**: `cd D:\SmartParking`
4. **Sau khi rewrite, KHÔNG THỂ quay lại** (trừ khi dùng backup)
5. **Nếu làm việc nhóm**: Báo trước với mọi người vì họ phải clone lại repo

---

## 📋 BƯỚC 1: BACKUP VÀ CHUẨN BỊ

```powershell
# 1. Vào thư mục project
cd D:\SmartParking

# 2. Kiểm tra git status (phải clean)
git status
```

**Kết quả mong đợi:**
```
On branch rewrite-history
nothing to commit, working tree clean
```

**Nếu có file chưa commit:**
```powershell
# Stash hoặc commit chúng trước
git add .
git commit -m "WIP: save before rewrite"
```

---

## 📋 BƯỚC 2: RESET VỀ ROOT (XÓA TẤT CẢ COMMITS)

```powershell
# 1. Đảm bảo đang ở branch rewrite-history
git checkout rewrite-history

# 2. Xem commit đầu tiên (commit root)
git log --oneline

# 3. Reset về TRƯỚC commit đầu tiên (xóa tất cả commits nhưng GIỮ files)
git reset --soft e067919^
```

**⚠️ Giải thích:**
- `e067919` là commit "Node Modules" (commit đầu tiên trong history)
- `^` nghĩa là "commit trước đó" (về trước commit root)
- `--soft` giữ lại tất cả files trong staging area
- Lệnh này XÓA tất cả commits nhưng KHÔNG XÓA files

**Kiểm tra:**
```powershell
git status
```

**Kết quả mong đợi:**
```
On branch rewrite-history
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
    [danh sách tất cả files đang staged]
```

---

## 📋 BƯỚC 3: UNSTAGE TẤT CẢ FILES

```powershell
# Chuyển tất cả files từ staged về unstaged
git reset
```

**Kiểm tra:**
```powershell
git status
```

**Kết quả mong đợi:**
```
On branch rewrite-history
Untracked files:
  (use "git add <file>..." to include in what will be committed)
    [danh sách tất cả files]
```

---

## 📋 BƯỚC 4: TẠO LẠI COMMITS TỪNG FOLDER/FILE

### 4.1. Commit docs/ → "Documents"

```powershell
git add docs/
git commit -m "Documents"
```

**Kiểm tra:**
```powershell
git log --oneline
```
**Kết quả:** `<hash> (HEAD -> rewrite-history) Documents`

---

### 4.2. Commit frontend/ → "frontend"

```powershell
git add frontend/
git commit -m "frontend"
```

**Kiểm tra:**
```powershell
git log --oneline
```
**Kết quả:** 
```
<hash> (HEAD -> rewrite-history) frontend
<hash> Documents
```

---

### 4.3. Commit reorganize/ → "reorganize instruction"

```powershell
git add reorganize/
git commit -m "reorganize instruction"
```

---

### 4.4. Commit scripts/ → "scripts"

```powershell
git add scripts/
git commit -m "scripts"
```

---

### 4.5. Commit .gitignore → "gitignore"

```powershell
git add .gitignore
git commit -m "gitignore"
```

---

### 4.6. Commit package-lock.json → "package-lock"

```powershell
git add package-lock.json
git commit -m "package-lock"
```

**⚠️ Lưu ý:** Nếu có lỗi "file not found", có thể file này đang bị gitignore. Kiểm tra bằng:
```powershell
git status
```

---

### 4.7. Commit package.json → "package"

```powershell
git add package.json
git commit -m "package"
```

---

### 4.8. Commit README.md → "README"

```powershell
git add README.md
git commit -m "README"
```

---

### 4.9. Kiểm tra còn file nào chưa commit không

```powershell
git status
```

**Nếu còn files:**
- `node_modules/` → **KHÔNG nên commit** (nặng, được tạo lại bằng npm install)
- Files khác → Quyết định có commit không

**Nếu muốn commit node_modules:**
```powershell
git add node_modules/
git commit -m "node_modules"
```

**⚠️ KHUYẾN NGHỊ:** KHÔNG commit `node_modules/`, thêm vào `.gitignore` thay vì commit.

---

## 📋 BƯỚC 5: KIỂM TRA TOÀN BỘ HISTORY MỚI

```powershell
git log --oneline
```

**Kết quả mong đợi (từ mới đến cũ):**
```
<hash> (HEAD -> rewrite-history) README
<hash> package
<hash> package-lock
<hash> gitignore
<hash> scripts
<hash> reorganize instruction
<hash> frontend
<hash> Documents
```

**Kiểm tra chi tiết từng commit:**
```powershell
git log --stat
```

**Đảm bảo:**
- ✅ 8 commits (hoặc nhiều hơn nếu commit thêm)
- ✅ Commit messages đúng
- ✅ Mỗi commit chỉ chứa đúng folder/file tương ứng

---

## 📋 BƯỚC 6: FORCE PUSH LÊN BRANCH REWRITE-HISTORY

```powershell
# Force push lên branch rewrite-history
git push --force origin rewrite-history
```

**⚠️ Lưu ý:**
- `--force` sẽ GHI ĐÈ history cũ trên GitHub
- Không thể hoàn tác (trừ khi có backup)

**Kiểm tra trên GitHub:**
1. Vào https://github.com/katherinenggit/SmartParking
2. Chọn branch `rewrite-history`
3. Xem commits → phải có 8 commits với messages đúng

---

## 📋 BƯỚC 7: MERGE VÀO MAIN (SAU KHI ĐÃ KIỂM TRA OK)

### Option A: Reset main về rewrite-history (đơn giản hơn)

```powershell
# 1. Checkout về main
git checkout main

# 2. Reset main về giống rewrite-history
git reset --hard rewrite-history

# 3. Force push main
git push --force origin main
```

### Option B: Merge bình thường (nếu muốn giữ merge commit)

```powershell
git checkout main
git merge rewrite-history --allow-unrelated-histories
git push origin main
```

**⚠️ KHUYẾN NGHỊ:** Dùng **Option A** vì history sẽ sạch hơn.

---

## 📋 BƯỚC 8: DỌN DẸP

### Xóa branch rewrite-history (nếu không cần nữa)

```powershell
# Xóa local
git branch -d rewrite-history

# Xóa trên GitHub
git push origin --delete rewrite-history
```

### Kiểm tra cuối cùng

```powershell
git log --oneline
git status
```

---

## 🆘 XỬ LÝ LỖI

### Lỗi 1: "fatal: ambiguous argument 'e067919^'"

**Nguyên nhân:** Commit hash không đúng hoặc không tồn tại.

**Giải pháp:**
```powershell
# Xem lại commit đầu tiên
git log --oneline --reverse

# Dùng hash đúng
git reset --soft <hash_đầu_tiên>^
```

---

### Lỗi 2: "error: failed to push some refs"

**Nguyên nhân:** Không có quyền force push hoặc branch bị protect.

**Giải pháp:**
1. Kiểm tra branch protection trên GitHub Settings
2. Tắt branch protection tạm thời
3. Hoặc dùng `git push --force-with-lease` thay vì `--force`

---

### Lỗi 3: "nothing to commit, working tree clean" khi git add

**Nguyên nhân:** File/folder không tồn tại hoặc đã bị gitignore.

**Giải pháp:**
```powershell
# Kiểm tra file có tồn tại không
ls docs/
ls frontend/

# Kiểm tra gitignore
git check-ignore -v docs/
```

---

### Lỗi 4: Làm sai và muốn quay lại

**Giải pháp:**
```powershell
# Abort mọi thứ
git reset --hard origin/main
git checkout main

# Hoặc dùng backup
cd ..
rmdir SmartParking /S /Q
xcopy SmartParking_backup_git SmartParking /E /I /H
```

---

## ✅ CHECKLIST HOÀN THÀNH

- [ ] Đã backup project
- [ ] Git status clean trước khi bắt đầu
- [ ] Reset về root thành công
- [ ] Unstage tất cả files
- [ ] Commit docs/ → "Documents"
- [ ] Commit frontend/ → "frontend"
- [ ] Commit reorganize/ → "reorganize instruction"
- [ ] Commit scripts/ → "scripts"
- [ ] Commit .gitignore → "gitignore"
- [ ] Commit package-lock.json → "package-lock"
- [ ] Commit package.json → "package"
- [ ] Commit README.md → "README"
- [ ] Kiểm tra git log có 8 commits đúng
- [ ] Force push lên rewrite-history
- [ ] Kiểm tra trên GitHub OK
- [ ] Merge vào main
- [ ] Force push main
- [ ] Xóa branch rewrite-history (optional)

---

## 💡 TIPS

1. **Kiểm tra sau mỗi bước:** Chạy `git status` và `git log --oneline` thường xuyên
2. **Không vội vàng:** Đọc kỹ output của mỗi lệnh
3. **Có backup:** Luôn có backup trước khi rewrite
4. **Test trên branch khác trước:** Nếu không chắc, test trên branch test trước
5. **Clone lại sau khi xong:** Để chắc chắn mọi thứ OK:
   ```powershell
   cd D:\
   git clone https://github.com/katherinenggit/SmartParking SmartParking_test
   cd SmartParking_test
   git log --oneline
   ```

---

**Rewrite thành công! 🎉**



