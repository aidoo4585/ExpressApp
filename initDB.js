//Using the script as a client in order to connenct to Cloud DB and create a table 
const mysql = require('mysql');

//Creating a connection to the server with DB
let conn = mysql.createConnection({
    host: '34.130.40.20',
    user: 'root',
    password: 'Password!',
    database: 'userDB'
});

//establishes the connection 
conn.connect();


conn.query(`Drop Table Availability`,
    (err, rows, fields) => {
        if (err)
            console.log(err);
        else
            console.log('Table Dropped');
    }
);

conn.query(`CREATE TABLE Availability
            (
                Name varchar(100) NOT NULL PRIMARY KEY,
                LastUpdate timestamp,
                AvailTimes json
            )
            `
    , (err, rows, fields) => {
        if (err)
            console.log(err);
        else
            console.log('Table Created');
    });

conn.query(`insert into Availability values ("Admin",CURRENT_TIME(),'["9:00","10:00","11:00","12:00","13:00","14:00", "15:00", "16:00", "17:00", "18:00"]')`
    , (err, rows, fields) => {
        if (err)
            console.log(err);
        else
            console.log('One row inserted');
    });
    
conn.query(`update Availability set LastUpdate = CURRENT_TIME(), AvailTimes = '{"09:00":true, "10:00":true, "11:00":true, "12:00":false, "13:00":true, "14:00":true, "15:00":true, "16:00":true, "17:00":true, "18:00":true}' where Name = "Cam"`//'{"9:00": true, "10:00": false, "11:00":true, "12:00":false, "1:00":false,"2:00":false,"3:00":false,"4:00":false,"5:00":false, "6:00":true}')`//, true, false, true)`
    , (err, rows, fields) => {
        if (err)
            console.log(err);
        else
            console.log('One row inserted');
    });

conn.query(`select * from Availability `
    , (err, rows, fields) => {
        let avail = [];

        if (err)
            console.log(err);
        else
            console.log('One row selected');

        console.log(rows);
    });

conn.end();