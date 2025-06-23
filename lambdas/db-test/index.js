const mysql = require('mysql2/promise');

const {
    DB_HOST,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
} = process.env;

exports.handler = async (event) => {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
        })

        const [rows] = await connection.query('SELECT 1 + 1 AS result');

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, resutle: rows[0].result }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    } finally{
        if (connection) await connection.end();
    }
}