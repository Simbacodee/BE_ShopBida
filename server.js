// Import các thư viện cần thiết
const express = require('express');
const mysql = require('mysql2/promise'); // Sử dụng mysql2/promise
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// Khởi tạo ứng dụng Express và router
const app = express();
const router = express.Router();

// Cấu hình middleware
app.use(cors()); // Cho phép các yêu cầu từ các nguồn gốc khác
app.use(express.json()); // Xử lý các yêu cầu JSON
app.use(express.static('./public')); // Phục vụ các file tĩnh từ thư mục public

// Cấu hình multer để lưu trữ file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images'); // Thư mục lưu trữ hình ảnh
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});
const upload = multer({ storage });

// Khởi tạo kết nối với MySQL
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: 'database_billiards'
});

// Route để lấy sản phẩm với phân trang
router.get('/items', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Trang hiện tại
        const limit = parseInt(req.query.limit) || 7; // Số lượng mặt hàng trên mỗi trang
        const offset = (page - 1) * limit; // Tính toán offset

        // Truy vấn tổng số mặt hàng để tính tổng số trang
        const [totalRows] = await db.query('SELECT COUNT(*) AS total FROM items');
        const total = totalRows[0].total;

        // Truy vấn để lấy dữ liệu phân trang
        const [items] = await db.query('SELECT * FROM items LIMIT ? OFFSET ?', [limit, offset]);

        // Tính toán tổng số trang
        const totalPages = Math.ceil(total / limit);

        res.json({
            items,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route để lấy sản phẩm theo danh mục
router.get('/items/categories', async (req, res) => {
    try {
        const categories = req.query.categories;
        if (!categories) {
            return res.status(400).send('Missing category_ids');
        }
        const [rows] = await db.query(`SELECT * FROM items WHERE category_id IN (${categories})`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route để tạo sản phẩm mới
app.post('/create', upload.single('image'), async (req, res) => {
    try {
        const sql = 'INSERT INTO items (name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?)';
        const values = [
            req.body.name,
            req.body.description,
            req.body.price,
            req.file ? req.file.filename : null,
            req.body.category_id
        ];
        const [result] = await db.query(sql, values);
        res.json(result);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Route để đọc thông tin sản phẩm theo ID
app.get('/read/:id', async (req, res) => {
    try {
        const sql = 'SELECT * FROM items WHERE id = ?';
        const id = req.params.id;
        const [result] = await db.query(sql, [id]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ Message: 'Error inside server' });
    }
});

// Route để chỉnh sửa sản phẩm theo ID
app.put('/edit/:id', upload.single('image'), async (req, res) => {
    try {
        const sql = 'UPDATE items SET name=?, description=?, price=?, image=?, category_id=? WHERE id=?';
        const values = [
            req.body.name,
            req.body.description,
            req.body.price,
            req.file ? req.file.filename : req.body.currentImage,
            req.body.category_id
        ];
        const id = req.params.id;
        const [data] = await db.query(sql, [...values, id]);
        res.json(data);
    } catch (err) {
        res.status(500).json("err");
    }
});

// Route để xóa sản phẩm theo ID
app.delete('/delete/:id', async (req, res) => {
    try {
        const sql = 'DELETE FROM items WHERE id = ?';
        const id = req.params.id;
        const [result] = await db.query(sql, [id]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ Message: 'Error inside server' });
    }
});

// Route để đặt hàng
app.post('/order', async (req, res) => {
    const { customerName, address, phoneNumber, email, totalAmount, items } = req.body;

    const connection = await db.getConnection(); // Lấy kết nối từ pool

    try {
        await connection.beginTransaction(); // Bắt đầu giao dịch

        // Lưu thông tin đơn hàng
        const orderQuery = 'INSERT INTO orders (customer_name, address, phone_number, email, total_amount) VALUES (?, ?, ?, ?, ?)';
        const [orderResult] = await connection.query(orderQuery, [customerName, address, phoneNumber, email, totalAmount]);

        const orderId = orderResult.insertId;

        // Lưu thông tin các sản phẩm trong đơn hàng
        const orderItemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?';
        const orderItemsData = items.map(item => [orderId, item.id, item.quantity, item.price]);

        await connection.query(orderItemsQuery, [orderItemsData]);

        await connection.commit(); // Commit giao dịch

        res.status(200).json({ message: 'Order placed successfully' });
    } catch (error) {
        await connection.rollback(); // Rollback giao dịch nếu có lỗi
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Failed to place order' });
    } finally {
        connection.release(); // Giải phóng kết nối
    }
});

// Route để lấy danh sách đơn hàng
router.get('/orders', async (req, res) => {
    try {
        const query = `
            SELECT o.id, o.customer_name, o.address, o.phone_number, o.email, o.total_amount, o.created_at, 
                   oi.product_id, oi.quantity, i.name AS item_name
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN items i ON oi.product_id = i.id;
        `;
        const [orders] = await db.query(query);
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.delete('/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        // Xóa các mục trong đơn hàng trước
        await db.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);

        // Xóa đơn hàng
        await db.query('DELETE FROM orders WHERE id = ?', [orderId]);

        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});
// Route để xóa đơn hàng theo ID
router.delete('/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        // Xóa các sản phẩm liên quan đến đơn hàng trước
        const deleteOrderItemsQuery = 'DELETE FROM order_items WHERE order_id = ?';
        await db.query(deleteOrderItemsQuery, [orderId]);

        // Xóa đơn hàng
        const deleteOrderQuery = 'DELETE FROM orders WHERE id = ?';
        const [result] = await db.query(deleteOrderQuery, [orderId]);

        res.json(result);
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Route để xác nhận đơn hàng
router.put('/orders/:id/confirm', async (req, res) => {
    try {
        const orderId = req.params.id;

        // Cập nhật trạng thái đơn hàng thành "confirmed" hoặc trạng thái tương ứng
        await db.query('UPDATE orders SET status = "confirmed" WHERE id = ?', [orderId]);

        res.status(200).json({ message: 'Order confirmed successfully' });
    } catch (error) {
        console.error('Error confirming order:', error);
        res.status(500).json({ error: 'Failed to confirm order' });
    }
});


// Route để đăng nhập admin
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM admin_accounts WHERE username = ? AND password = ?', [username, password]);

        if (rows.length > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ success: false });
    }
});

// Route để tìm kiếm sản phẩm theo tên
router.get('/items/search', async (req, res) => {
    try {
        const searchText = req.query.q;
        if (!searchText) {
            return res.status(400).send('Missing search query');
        }

        // Truy vấn sản phẩm theo tên
        const [rows] = await db.query('SELECT * FROM items WHERE name LIKE ?', [`%${searchText}%`]);
        res.json(rows);
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Đăng ký router vào ứng dụng
app.use('/api', router);

// Khởi chạy ứng dụng
app.listen(8081, () => {
    console.log("Listening on port 8081");
});
