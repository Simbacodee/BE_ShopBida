const express = require('express');
const mysql = require('mysql2'); // Sử dụng mysql2 thay vì mysql
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

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: 'database_billiards'
});

db.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

app.get('/', (req, res) => {
    const sql = "SELECT * FROM items";
    db.query(sql, (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
    });
});

<<<<<<< HEAD
app.post('/create', upload.single('image'), (req, res) => {
    const sql = 'INSERT INTO items (`name`, `description`, `price`, `image`, `category_id`) VALUES (?, ?, ?, ?, ?)';
=======
app.post('/item', (req, res) => {
    const sql = 'INSERT INTO items (`name`, `description`,`price`,`image`,`category_id`) VALUES (?)';
>>>>>>> b33a787d8237ba7928b660748ea6e7c0bc16808c
    const values = [
        req.body.name,
        req.body.description,
        req.body.price,
<<<<<<< HEAD
        req.file ? req.file.filename : null, // Kiểm tra xem tệp có được tải lên không
        req.body.category_id
    ];
    db.query(sql, values, (err, result) => {
=======
        req.body.image,
        req.body.category_id,
        
    ]
    db.query(sql, [values], (err, result) => {
>>>>>>> b33a787d8237ba7928b660748ea6e7c0bc16808c
        if (err) return res.json(err);
        return res.json(result);
    });
});

app.get('/read/:id', (req, res) => {
    const sql = "SELECT * FROM items WHERE id = ?";
    const id = req.params.id;
    db.query(sql, [id], (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
    });
});

<<<<<<< HEAD
app.put('/edit/:id', upload.single('image'), (req, res) => {
    const sql = 'UPDATE items SET `name`=?, `description`=?, `price`=?, `image`=?, `category_id`=? WHERE id=?';
    const values = [
        req.body.name,
        req.body.description,
        req.body.price,
        req.file ? req.file.filename : req.body.currentImage, // Giữ nguyên hình ảnh hiện tại nếu không có tệp mới
        req.body.category_id
    ];
    const id = req.params.id;
    db.query(sql, [...values, id], (err, data) => {
        if (err) return res.json("err");
        return res.json(data);
=======
app.put('/edit/:id', (req, res) => {
    const sql = 'UPDATE items SET `name`=?, `description`=?, `price`=?, `image`=?,`category_id`=? WHERE id=?';
    const id = req.params.id;
    db.query(sql, [req.body.name, req.body.description, req.body.price, req.body.image, req.body.category_id,  id], (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
>>>>>>> b33a787d8237ba7928b660748ea6e7c0bc16808c
    });
});

app.delete('/delete/:id', (req, res) => {
    const sql = 'DELETE FROM items WHERE id = ?';
    const id = req.params.id;
    db.query(sql, [id], (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
    });
});

// Route để lấy sản phẩm theo category_id
router.get('/items/categories', async (req, res) => {
    try {
        const categories = req.query.categories;
        if (!categories) {
            return res.status(400).send('Missing category_ids');
        }

        // Xử lý để lấy sản phẩm từ các category_id
        const query = `SELECT * FROM items WHERE category_id IN (${categories})`;
        const [rows] = await db.promise().query(query);

        res.json(rows);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.use('/api', router);

app.listen(8081, () => {
<<<<<<< HEAD
    console.log("Listening on port 8081");
});
=======
    console.log("Listening");
})
>>>>>>> b33a787d8237ba7928b660748ea6e7c0bc16808c
