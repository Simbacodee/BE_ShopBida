const express = require('express');
const mysql = require('mysql2/promise'); // Sử dụng mysql2/promise
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use(express.static('./public'));

// Tạo chỗ chứa file img
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images');
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


app.use('/api', router);

app.listen(8081, () => {
    console.log("Listening on port 8081");
});
