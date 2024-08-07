import express from 'express';
import mysql from 'mysql';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json())

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: 'database_billiards'
})

app.get('/', (req, res) => {
    const sql = "SELECT * FROM items"
    db.query(sql, (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
    })
})

app.post('/item', (req, res) => {
    const sql = 'INSERT INTO items (`name`, `description`,`price`,`image`,`category_id`,`brand_id`) VALUES (?)';
    const values = [
        req.body.name,
        req.body.description,
        req.body.price,
        req.body.image,
        req.body.category_id,
        req.body.brand_id
    ]
    db.query(sql, [values], (err, result) => {
        if (err) return res.json(err);
        return res.json(result);
    })
})

app.get('/read/:id', (req, res) => {
    const sql = "SELECT * FROM items WHERE id = ?";
    const id = req.params.id;
    db.query(sql, [id], (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
    })
})

app.put('/edit/:id', (req, res) => {
    const sql = 'UPDATE items SET `name`=?, `description`=?, `price`=?, `image`=?,`category_id`=?,`brand_id`=? WHERE id=?';
    const id = req.params.id;
    db.query(sql, [req.body.name, req.body.description, req.body.price, req.body.image, req.body.category_id, req.body.brand_id, id], (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
    });
});

app.delete('/delete/:id', (req, res) => {
    const sql = 'DELETE FROM items WHERE id = ?';
    const id = req.params.id;
    db.query(sql, [id], (err, result) => {
        if (err) return res.json({ Message: "Error inside server" });
        return res.json(result);
    });
})

app.listen(8081, () => {
    console.log("Listening");
})