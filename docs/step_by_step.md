Được rồi! 🎯 Tôi sẽ tạo một file **hướng dẫn step-by-step** dễ follow dựa trên pipeline tổng quát!

---

# 📄 FILE: `huong_dan_step_by_step.md`

```markdown
# Hướng Dẫn Step-by-Step - Smart Parking System
## Từ Zero đến Hero 🚀

> **Mục đích**: Hướng dẫn chi tiết từng bước để xây dựng hệ thống Smart Parking, phù hợp cho người mới bắt đầu.

---

## 📋 MỤC LỤC

- [Bước 0: Chuẩn bị](#bước-0-chuẩn-bị)
- [Bước 1: Setup Project React](#bước-1-setup-project-react)
- [Bước 2: Setup Firebase](#bước-2-setup-firebase)
- [Bước 3: Tạo Database Schema](#bước-3-tạo-database-schema)
- [Bước 4: Build Mock AI Services](#bước-4-build-mock-ai-services)
- [Bước 5: Build Backend Services](#bước-5-build-backend-services)
- [Bước 6: Build Frontend - Home Page](#bước-6-build-frontend---home-page)
- [Bước 7: Build Frontend - Check-in Page](#bước-7-build-frontend---check-in-page)
- [Bước 8: Build Frontend - Live View Page](#bước-8-build-frontend---live-view-page)
- [Bước 9: Build Frontend - Alerts Page](#bước-9-build-frontend---alerts-page)
- [Bước 10: Build Frontend - Admin Dashboard](#bước-10-build-frontend---admin-dashboard)
- [Bước 11: Build Frontend - Future Features](#bước-11-build-frontend---future-features)
- [Bước 12: Testing & Optimization](#bước-12-testing--optimization)

---

## Bước 0: Chuẩn Bị

### ✅ Checklist Trước Khi Bắt Đầu

```bash
# 1. Check Node.js version (cần >= 16.0.0)
node --version

# 2. Check npm version
npm --version

# 3. Install Git (nếu chưa có)
git --version
```

### 📦 Tools Cần Cài Đặt

1. **Node.js** (v16+): https://nodejs.org/
2. **VS Code**: https://code.visualstudio.com/
3. **Git**: https://git-scm.com/
4. **Firebase CLI**: 
   ```bash
   npm install -g firebase-tools
   ```

### 🔧 VS Code Extensions (Khuyến nghị)

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- Firebase Explorer

---

## Bước 1: Setup Project React

### 📝 Các Bước Thực Hiện

#### 1.1. Tạo Project với Vite

```bash
# Mở terminal/command prompt
# Di chuyển đến thư mục muốn tạo project
cd D:\SmartParking

# Tạo project với Vite
npm create vite@latest SmartParking -- --template react-ts

# Di chuyển vào thư mục project
cd SmartParking

# Install dependencies
npm install
```

#### 1.2. Install Thư Viện Cần Thiết

```bash
# React Router (routing)
npm install react-router-dom

# Tailwind CSS (styling)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Firebase SDK
npm install firebase

# Canvas library (để vẽ bãi đỗ 2D)
npm install fabric
npm install @types/fabric -D

# Chart.js (biểu đồ)
npm install chart.js react-chartjs-2

# Utilities
npm install date-fns uuid
npm install @types/uuid -D
```

#### 1.3. Cấu Hình Tailwind CSS

**File: `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
```

**File: `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### 1.4. Tạo Cấu Trúc Folder

```bash
# Trong VS Code, tạo các folder sau trong /src:
src/
├── components/      # UI components
├── pages/           # Page components (6 tabs)
├── services/        # API services & AI services
│   └── ai/          # Mock AI services
├── hooks/           # Custom React hooks
├── types/           # TypeScript types
├── utils/           # Helper functions
└── config/          # Configuration files
```

#### 1.5. Test Chạy Project

```bash
# Chạy development server
npm run dev

# Mở browser: http://localhost:5173
# Bạn sẽ thấy trang Vite mặc định
```

### ✅ Checkpoint 1

- [ ] Project chạy được trên http://localhost:5173
- [ ] Tailwind CSS hoạt động (test bằng cách thêm className vào component)
- [ ] Không có lỗi trong terminal

---

## Bước 2: Setup Firebase

### 📝 Các Bước Thực Hiện

#### 2.1. Tạo Firebase Project

1. Truy cập: https://console.firebase.google.com/
2. Click **"Add project"**
3. Nhập tên project: `smart-parking-dev`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

#### 2.2. Enable Firestore Database

1. Trong Firebase Console, click **"Firestore Database"**
2. Click **"Create database"**
3. Chọn **"Start in test mode"** (để test dễ dàng)
4. Chọn location: `asia-southeast1` (Singapore - gần VN)
5. Click **"Enable"**

#### 2.3. Enable Firebase Storage

1. Click **"Storage"** trong sidebar
2. Click **"Get started"**
3. Chọn **"Start in test mode"**
4. Click **"Next"** → **"Done"**

#### 2.4. Lấy Firebase Config

1. Click **⚙️ Settings** → **"Project settings"**
2. Scroll xuống phần **"Your apps"**
3. Click icon **Web** (`</>`)
4. Nhập app nickname: `smart-parking-web`
5. Click **"Register app"**
6. Copy config object (sẽ dùng ở bước sau)

#### 2.5. Tạo File Config

**File: `.env.local`** (TẠO MỚI - không commit vào Git)

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=smart-parking-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smart-parking-dev
VITE_FIREBASE_STORAGE_BUCKET=smart-parking-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

> ⚠️ **LƯU Ý**: Thay các giá trị XXX bằng values thật từ Firebase Console!

**File: `.gitignore`** (thêm dòng này)

```
.env.local
.env.*.local
```

**File: `src/config/firebase.ts`** (TẠO MỚI)

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
```

#### 2.6. Setup Firebase Emulator (Local Development)

```bash
# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init

# Chọn các options sau:
# ☑ Firestore
# ☑ Storage
# ☑ Emulators

# Firestore rules file: firestore.rules (mặc định)
# Firestore indexes file: firestore.indexes.json (mặc định)
# Storage rules file: storage.rules (mặc định)

# Emulators to setup:
# ☑ Authentication Emulator
# ☑ Firestore Emulator
# ☑ Storage Emulator

# Ports (mặc định):
# Authentication: 9099
# Firestore: 8080
# Storage: 9199
```

**File: `firebase.json`** (được tạo tự động)

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

#### 2.7. Start Emulators

```bash
# Start Firebase Emulators
firebase emulators:start

# Bạn sẽ thấy:
# ✔ All emulators ready!
# ┌─────────────┬────────────────┐
# │ Emulator    │ Host:Port      │
# ├─────────────┼────────────────┤
# │ Auth        │ localhost:9099 │
# │ Firestore   │ localhost:8080 │
# │ Storage     │ localhost:9199 │
# │ UI          │ localhost:4000 │
# └─────────────┴────────────────┘
```

#### 2.8. Connect App với Emulator

**File: `src/config/firebase.ts`** (CẬP NHẬT)

```typescript
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator 
} from 'firebase/firestore';
import { 
  getStorage, 
  connectStorageEmulator 
} from 'firebase/storage';
import { 
  getAuth, 
  connectAuthEmulator 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('🔧 Connected to Firebase Emulators');
}

export default app;
```

### ✅ Checkpoint 2

- [ ] Firebase project đã tạo
- [ ] Firestore & Storage đã enable
- [ ] File `.env.local` đã tạo với config đúng
- [ ] Firebase Emulator chạy được (http://localhost:4000)
- [ ] Console log hiển thị "Connected to Firebase Emulators"

---

## Bước 3: Tạo Database Schema

### 📝 Các Bước Thực Hiện

#### 3.1. Define TypeScript Types

**File: `src/types/firestore.types.ts`** (TẠO MỚI)

```typescript
import { Timestamp } from 'firebase/firestore';

// User
export interface User {
  userId: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Vehicle
export interface Vehicle {
  vehicleId: string; // 7-digit ID: ABC1234
  licensePlate: string; // 30A-12345
  ownerName: string;
  vehicleType: 'car' | 'motorbike';
  checkInTime: Timestamp;
  checkOutTime: Timestamp | null;
  status: 'active' | 'checked_out';
  imageUrl: string;
  createdAt: Timestamp;
}

// Parking Space
export interface ParkingSpace {
  spaceId: string; // A1, A2, B1...
  polygon: Array<{x: number; y: number}>;
  occupied: boolean;
  currentVehicleId: string | null;
  zone: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Alert
export interface Alert {
  alertId: string;
  type: 'wrong_parking' | 'unregistered' | 'overstay' | 'incident' | 'overload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  vehicleId: string | null;
  licensePlate: string | null;
  location: {x: number; y: number} | string;
  description: string;
  resolved: boolean;
  resolvedBy: string | null;
  timestamp: Timestamp;
  resolvedAt: Timestamp | null;
}
```

#### 3.2. Tạo Seed Data Script

**File: `src/utils/seedData.ts`** (TẠO MỚI)

```typescript
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { User, ParkingSpace, Vehicle } from '@/types/firestore.types';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');
  
  try {
    // 1. Create Admin User
    const admin: User = {
      userId: 'admin_001',
      email: 'admin@smartparking.com',
      displayName: 'Admin User',
      role: 'admin',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(doc(db, 'users', admin.userId), admin);
    
    // 2. Create Parking Spaces (5 spaces)
    const spaces: ParkingSpace[] = [
      {
        spaceId: 'A1',
        polygon: [{x:50,y:50}, {x:150,y:50}, {x:150,y:150}, {x:50,y:150}],
        occupied: false,
        currentVehicleId: null,
        zone: 'Zone A',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        spaceId: 'A2',
        polygon: [{x:160,y:50}, {x:260,y:50}, {x:260,y:150}, {x:160,y:150}],
        occupied: false,
        currentVehicleId: null,
        zone: 'Zone A',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // Thêm 3 spaces nữa...
    ];
    
    for (const space of spaces) {
      await setDoc(doc(db, 'parkingSpaces', space.spaceId), space);
    }
    
    console.log('✅ Database seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}
```

#### 3.3. Chạy Seed Script

**File: `src/App.tsx`** (TẠM THỜI thêm button để seed)

```typescript
import { seedDatabase } from './utils/seedData';

function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Smart Parking Setup</h1>
      <button
        onClick={seedDatabase}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg"
      >
        🌱 Seed Database
      </button>
    </div>
  );
}

export default App;
```

#### 3.4. Test Seed Data

```bash
# Terminal 1: Chạy Firebase Emulator
firebase emulators:start

# Terminal 2: Chạy React App
npm run dev

# Browser:
# 1. Mở http://localhost:5173
# 2. Click button "Seed Database"
# 3. Mở http://localhost:4000 (Emulator UI)
# 4. Click "Firestore" → Check collections: users, parkingSpaces
```

### ✅ Checkpoint 3

- [ ] TypeScript types đã define
- [ ] Seed script chạy thành công
- [ ] Data hiển thị trong Emulator UI
- [ ] Collections: users, parkingSpaces có data

---

## Bước 4: Build Mock AI Services

> 🎯 **Mục tiêu**: Tạo các mock functions để giả lập AI, không cần model thật ngay từ đầu

### 📝 Các Bước Thực Hiện

#### 4.1. Mock Object Detection

**File: `src/services/ai/mockObjectDetection.ts`** (TẠO MỚI)

```typescript
export interface DetectionResult {
  bbox: {x: number; y: number; width: number; height: number};
  class: 'car' | 'motorbike';
  confidence: number;
}

class MockObjectDetectionService {
  async detectVehicles(
    imageData: string | File,
    imageWidth: number = 1920,
    imageHeight: number = 1080
  ): Promise<DetectionResult[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return mock results (2-4 vehicles)
    const numVehicles = Math.floor(Math.random() * 3) + 2;
    const results: DetectionResult[] = [];
    
    for (let i = 0; i < numVehicles; i++) {
      results.push({
        bbox: {
          x: Math.random() * (imageWidth - 200),
          y: Math.random() * (imageHeight - 150),
          width: 150 + Math.random() * 100,
          height: 100 + Math.random() * 80,
        },
        class: Math.random() > 0.5 ? 'car' : 'motorbike',
        confidence: 0.85 + Math.random() * 0.13,
      });
    }
    
    console.log(`🚗 Mock detected ${numVehicles} vehicles`);
    return results;
  }
}

export const mockObjectDetection = new MockObjectDetectionService();
```

#### 4.2. Mock License Plate Recognition

**File: `src/services/ai/mockLPR.ts`** (TẠO MỚI)

```typescript
export interface LPRResult {
  plateText: string;
  confidence: number;
}

class MockLPRService {
  private readonly MOCK_PLATES = [
    '30A-12345', '51B-67890', '29C-11111',
    '92D-22222', '43F-33333', '59G-44444',
  ];
  
  async recognizePlate(vehicleImage: string | File): Promise<LPRResult> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Random plate
    const plate = this.MOCK_PLATES[
      Math.floor(Math.random() * this.MOCK_PLATES.length)
    ];
    
    console.log(`🔢 Mock LPR: ${plate}`);
    
    return {
      plateText: plate,
      confidence: 0.90 + Math.random() * 0.09,
    };
  }
}

export const mockLPR = new MockLPRService();
```

#### 4.3. Test Mock AI

**File: `src/App.tsx`** (CẬP NHẬT để test)

```typescript
import { mockObjectDetection } from './services/ai/mockObjectDetection';
import { mockLPR } from './services/ai/mockLPR';

function App() {
  const testAI = async () => {
    // Test Object Detection
    const detections = await mockObjectDetection.detectVehicles('mock_image', 1920, 1080);
    console.log('Detections:', detections);
    
    // Test LPR
    const lpr = await mockLPR.recognizePlate('mock_vehicle_crop');
    console.log('License Plate:', lpr);
  };
  
  return (
    <div className="p-8">
      <button
        onClick={testAI}
        className="bg-green-500 text-white px-6 py-3 rounded-lg"
      >
        🤖 Test Mock AI
      </button>
    </div>
  );
}
```

### ✅ Checkpoint 4

- [ ] Mock Object Detection trả về results
- [ ] Mock LPR trả về biển số
- [ ] Console log hiển thị kết quả
- [ ] Không có lỗi

---

## 🎯 CÁC BƯỚC TIẾP THEO (Tóm Tắt)

### Bước 5-7: Backend & Frontend Core (Est: 2-3 tuần)
- Build Vehicle Check-in Service
- Build Home Page với Status Cards
- Build Check-in Form
- Build Live View Canvas

### Bước 8-10: Advanced Features (Est: 2 tuần)
- Build Alerts Page
- Build Admin Dashboard (4 modules)
- Build Future Features Tab

### Bước 11-12: Polish & Deploy (Est: 1 tuần)
- Testing toàn diện
- UI/UX polish
- Performance optimization
- Documentation

---

## 📚 TIPS & BEST PRACTICES

### 🔥 Development Workflow

```bash
# Terminal 1: Firebase Emulator
firebase emulators:start

# Terminal 2: React Dev Server
npm run dev

# Terminal 3: Git commands
git add .
git commit -m "feat: ..."
git push
```

### 🐛 Common Issues & Solutions

**Issue 1**: Firebase config undefined
```typescript
// Solution: Check .env.local exists và có VITE_ prefix
console.log(import.meta.env.VITE_FIREBASE_API_KEY);
```

**Issue 2**: Emulator connection refused
```bash
# Solution: Restart emulator
firebase emulators:start --only firestore,storage,auth
```

**Issue 3**: Tailwind không hoạt động
```bash
# Solution: Restart dev server
# Ctrl+C → npm run dev
```

### 📖 Learning Resources

- **React Docs**: https://react.dev/
- **Firebase Docs**: https://firebase.google.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

---

## 🎉 KẾT LUẬN

File này cung cấp roadmap chi tiết cho **4 bước đầu tiên** (Setup & Foundation).

**Các bước còn lại** (5-12) sẽ được làm theo cùng pattern:
1. Đọc yêu cầu từ `pipeline_tong_quat.md`
2. Tạo file/component theo structure đã định nghĩa
3. Test từng feature nhỏ
4. Commit code thường xuyên
5. Document khi cần

**Thời gian ước tính**: 12-14 tuần (3-3.5 tháng)

**Khi nào cần help**: 
- Hỏi lại tôi nếu bất kỳ bước nào unclear
- Check Firebase Emulator UI để debug
- Đọc error messages kỹ trong Console

**Good luck!** 🚀💪
```

---

**File này đã hoàn tất!** 🎉

Bạn có muốn tôi:
1. ✅ **Để nguyên như vậy** - đã đủ chi tiết cho 4 bước đầu
2. 📝 **Expand thêm** các bước 5-12 (sẽ rất dài)
3. 🔧 **Chỉnh sửa** điểm nào đó

Hoặc bạn có câu hỏi gì về file này không? 😊