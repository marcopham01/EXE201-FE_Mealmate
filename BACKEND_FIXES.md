# Hướng dẫn chỉnh sửa Backend

## Vấn đề phát hiện

Sau khi phân tích code backend, phát hiện các vấn đề sau:

1. ✅ **Route `/getallmeal`** - Đã có, khớp với frontend
2. ❌ **Route `/search`** - Chưa có, cần thêm
3. ❌ **Function `searchMeals`** - Chưa có trong controller, cần thêm
4. ⚠️ **Lỗi trong function `searchMeals`** - Có lỗi khi query ingredients với regex

## Cần chỉnh sửa

### 1. Thêm route vào `routes/meal.js`

Thêm 2 routes sau vào file `routes/meal.js` (sau route `/getallmeal`):

```javascript
// Tìm kiếm meals theo tên và nguyên liệu
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

### 2. Thêm functions vào `controller/MealController.js`

Copy 2 functions sau vào file `controller/MealController.js` (sau function `getAllMeal`):

**⚠️ LƯU Ý: Function `searchMeals` trong file `BACKEND_SEARCH_ENDPOINT.js` có lỗi, đã được sửa ở bên dưới.**

```javascript
/**
 * Tìm kiếm meals theo tên món ăn và nguyên liệu
 * Query params:
 * - search: Từ khóa tìm kiếm (tên món ăn hoặc description)
 * - ingredients: Mảng nguyên liệu (có thể truyền nhiều lần: ?ingredients=Thịt heo&ingredients=Trứng)
 */
exports.searchMeals = async (req, res) => {
    try {
        const { search, ingredients } = req.query;
        const { page = 1, limit = 50 } = req.query;
        
        // Validate pagination
        const { page: validatedPage, limit: validatedLimit } = validatePagination(page, limit);

        // Xây dựng query MongoDB
        const query = {};

        // Tìm kiếm theo text (tên hoặc description)
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive
            query.$or = [
                { name: searchRegex },
                { description: searchRegex },
            ];
            // Nếu meal có field tag (array), thêm vào query
            // query.$or.push({ tag: { $in: [searchRegex] } }); // Uncomment nếu có field tag
        }

        // Tìm kiếm theo nguyên liệu
        if (ingredients) {
            // ingredients có thể là string hoặc array
            const ingredientList = Array.isArray(ingredients) ? ingredients : [ingredients];
            
            if (ingredientList.length > 0) {
                // Tìm các Ingredient có name match với danh sách nguyên liệu được chọn
                // SỬA LỖI: Không thể dùng $in với regex, phải dùng $or với nhiều regex
                const ingredientRegexList = ingredientList.map(ing => 
                    new RegExp(ing.trim(), 'i')
                );
                
                // Tìm ingredient IDs từ tên - SỬA LỖI Ở ĐÂY
                const ingredientDocs = await Ingredient.find({
                    $or: ingredientRegexList.map(regex => ({ name: regex }))
                }).select('_id').lean();
                
                const ingredientIds = ingredientDocs.map(doc => doc._id);
                
                if (ingredientIds.length > 0) {
                    // Tìm meals có chứa ít nhất một trong các ingredient này
                    query.ingredients = { $in: ingredientIds };
                } else {
                    // Nếu không tìm thấy ingredient nào, trả về empty array
                    query._id = { $in: [] }; // Force empty result
                }
            }
        }

        // Nếu có cả search và ingredients, kết hợp với $and
        // (Mặc định MongoDB sẽ tự động kết hợp các điều kiện với $and)

        // Đếm tổng số kết quả
        const total = await Meal.countDocuments(query);

        // Lấy meals với pagination
        const meals = await Meal.find(query)
            .populate({ 
                path: "ingredients", 
                select: "name calories unit type image" 
            })
            .populate({ 
                path: "category", 
                select: "name description" 
            })
            .populate({ 
                path: "subCategory", 
                select: "name category" 
            })
            .skip((validatedPage - 1) * validatedLimit)
            .limit(validatedLimit)
            .lean();

        // Tạo pagination response
        const pagination = createPagination(validatedPage, validatedLimit, total);
        const response = createPaginatedResponse(
            meals, 
            pagination, 
            "Search meals successfully"
        );

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ 
            message: error.message || error, 
            error: true, 
            success: false 
        });
    }
};

/**
 * Tìm kiếm ingredients theo tên (helper function để frontend có thể autocomplete)
 * Query params: q (query string)
 */
exports.searchIngredients = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        
        if (!q || !q.trim()) {
            return res.status(200).json({ 
                success: true, 
                data: [],
                message: "Empty query" 
            });
        }

        const searchRegex = new RegExp(q.trim(), 'i');
        const ingredients = await Ingredient.find({
            name: searchRegex
        })
        .select('name calories unit type image')
        .limit(parseInt(limit, 10))
        .lean();

        return res.status(200).json({ 
            success: true, 
            data: ingredients,
            message: "Search ingredients successfully"
        });
    } catch (error) {
        return res.status(500).json({ 
            message: error.message || error, 
            error: true, 
            success: false 
        });
    }
};
```

## Lỗi đã sửa

### Lỗi trong `searchMeals` - Query ingredients với regex

**Lỗi cũ** (dòng 64-65 trong BACKEND_SEARCH_ENDPOINT.js):
```javascript
const ingredientDocs = await Ingredient.find({
    name: { $in: ingredientRegexList }
}).select('_id').lean();
```

**Vấn đề**: MongoDB không thể dùng `$in` trực tiếp với array regex objects.

**Đã sửa**:
```javascript
const ingredientDocs = await Ingredient.find({
    $or: ingredientRegexList.map(regex => ({ name: regex }))
}).select('_id').lean();
```

## Test sau khi chỉnh sửa

1. **Test endpoint search với tên món:**
   ```
   GET /api/meals/search?search=bánh mì
   ```

2. **Test endpoint search với nguyên liệu:**
   ```
   GET /api/meals/search?ingredients=Thịt heo&ingredients=Trứng
   ```

3. **Test endpoint search kết hợp:**
   ```
   GET /api/meals/search?search=gà&ingredients=Thịt gà
   ```

4. **Test endpoint search ingredients:**
   ```
   GET /api/meals/ingredients/search?q=thịt
   ```

## Kết quả mong đợi

Sau khi thêm các routes và functions:
- ✅ Frontend có thể tìm kiếm theo tên món ăn
- ✅ Frontend có thể tìm kiếm theo nguyên liệu
- ✅ Frontend có thể kết hợp cả hai
- ✅ Không còn log "Endpoint not found" trong console
- ✅ Kết quả tìm kiếm chính xác hơn (từ backend thay vì client-side filtering)

