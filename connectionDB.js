const mysql = require('mysql');

function newConnection()
{
    let conn = mysql.createConnection({
        host: '34.130.40.20',
    user: 'root',
    password: 'Password!',
    database: 'userDB'
    });
    return conn;
}
module.exports = newConnection;
