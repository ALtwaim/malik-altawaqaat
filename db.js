const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '9009',
    database: 'Football'});

db.connect((err) => {
    if (err) {
        console.log('Connection Error');
        console.log(err);
    } else {
        console.log('Connected To MySQL');
    }
});

module.exports = db;