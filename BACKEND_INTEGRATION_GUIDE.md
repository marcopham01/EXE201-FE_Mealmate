# Hướng dẫn tích hợp Backend cho chức năng tìm kiếm Meal

## Tổng quan

Chức năng tìm kiếm Meal đã được implement ở frontend. Để hoàn thiện, bạn cần thêm endpoint search vào backend.

## Các file đã tạo

1. **Frontend:**
   - `src/api/meals.js` - API functions để gọi backend
   - `src/screens/SearchRecipeScreen.js` - Màn hình tìm kiếm với UI giống design
   - `src/navigation/AuthStack.js` - Đã thêm route SearchRecipe
   - `src/screens/RecipeScreen.js` - Đã cập nhật search bar để navigate

2. **Backend code (cần thêm):**
   - `BACKEND_SEARCH_ENDPOINT.js` - Code endpoint search cần copy vào backend

## Cách tích hợp Backend

### Bước 1: Thêm endpoint search vào MealController.js

Copy code từ file `BACKEND_SEARCH_ENDPOINT.js` vào file `controller/MealController.js`:

```javascript
// Thêm 2 functions sau vào MealController.js:

exports.searchMeals = async (req, res) => {
    // ... (xem code trong BACKEND_SEARCH_ENDPOINT.js)
}

exports.searchIngredients = async (req, res) => {
    // ... (xem code trong BACKEND_SEARCH_ENDPOINT.js)
}
```

### Bước 2: Thêm routes vào routes/meal.js

Thêm 2 routes mới vào file `routes/meal.js`:

```javascript
// Tìm kiếm meals
router.get("/search",
    auth.authMiddleWare,
    auth.requireRole("admin","customer"),
    meal.searchMeals);

// Tìm kiếm ingredients (optional - để autocomplete)
router.get("/ingredients/search",
    auth.authMiddleWare,
    auth.requireRole("admin","customer"),
    meal.searchIngredients);
```

### Bước 3: Kiểm tra API endpoint

Frontend sẽ gọi:
- `GET /api/meals/search?search=thịt&ingredients=Thịt heo&ingredients=Trứng gà`
- `GET /api/meals/getallmeal?page=1&limit=50` (fallback nếu search chưa có)

### Bước 4: Format dữ liệu

Backend cần trả về format như sau:

**Response của getAllMeal:**
```json
{
  "success": true,
  "message": "Get all meal successfully",
  "data": [
    {
      "_id": "...",
      "name": "BÁNH MÌ TRỨNG",
      "description": "Bánh mì, trứng, pate",
      "ingredients": [
        {
          "_id": "...",
          "name": "Trứng gà",
          "calories": 100,
          "unit": "quả",
          "type": "protein",
          "image": "..."
        }
      ],
      "instructions": ["Bước 1", "Bước 2"],
      "totalKcal": 350,
      "mealTime": ["breakfast"],
      "dietType": "Giảm cân",
      "category": { "name": "..." },
      "subCategory": { "name": "..." }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Response của searchMeals:** (giống format trên)

Frontend sẽ tự động transform:
- `name` → `title`
- `description` → `desc`
- `ingredients[].name` → `mealIngredients[]`
- Tính `time` từ `instructions.length`

## Cách hoạt động

### Khi backend chưa có endpoint search:

Frontend sẽ:
1. Thử gọi `/api/meals/search` → nếu lỗi
2. Fallback: Gọi `/api/meals/getallmeal` → lấy tất cả
3. Filter ở client-side theo `searchText` và `ingredients`

### Khi backend đã có endpoint search:

Frontend sẽ:
1. Gọi `/api/meals/search?search=...&ingredients=...`
2. Nhận kết quả đã được filter từ backend
3. Transform và hiển thị

## Test

1. **Test với backend chưa có endpoint search:**
   - Frontend vẫn hoạt động (fallback về getAllMeal + client filter)
   - Có thể có hiệu năng kém nếu có nhiều meals

2. **Test với backend đã có endpoint search:**
   - Tìm kiếm nhanh hơn
   - Kết quả chính xác hơn

## Lưu ý

- Đảm bảo `BASE_URL` trong `src/api/auth.js` trỏ đúng backend
- Token authentication được tự động thêm vào headers
- Nếu backend trả về format khác, cần cập nhật function `transformMealFromBackend()` trong `src/api/meals.js`

## Troubleshooting

### Không tìm thấy kết quả

- Kiểm tra backend có trả về data không
- Kiểm tra format response có đúng không
- Xem console logs để debug

### Lỗi CORS

- Đảm bảo backend cho phép CORS từ frontend
- Kiểm tra BASE_URL có đúng không

### Lỗi authentication

- Đảm bảo user đã login
- Token được lưu trong AsyncStorage
