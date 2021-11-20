//Creating an instance of the server
const express = require('express');
const newConnection = require('./connectionDB');

const correctUsr = "admin";
const correctPass = "123";
const app = express();

// serve static contents
app.use(express.static('static'));

app.use(express.urlencoded({
    extended: true
}));

// Admin page login
app.post('/admin', (req, res) => {
    //Checks passwords against whats saved in doc. (Not secure but has working password)
    if(req.body.adminUsr === correctUsr && req.body.adminPass === correctPass) {
        let conn = newConnection();
        conn.connect();

        let content = '<div><div>Doodle App - Admin Portal (Please save availability and time changes seperatly)</div>'
                            +'<table style="min-width: 100vw; padding: 5px 15px">';                                        

        //Gets the name and availtimes obj from availability. selects Admin entry first
        conn.query( `select Name, AvailTimes from Availability order by Name, case Name when "Admin" then '1' else '2' end`
                , (err,rows,fields) => {
                    if (err)
                        console.log(err);
                    else {
                        // Get the current ordered times array 
                        let adminTimes = JSON.parse(rows[0].AvailTimes);
                        rows.shift(); //Removes the Admin from the array

                        content +='<table style="min-width: 100vw; padding: 5px 15px">'
                                    +'<form action="/admin/time" method="post" style="display:table-header-group; vertical-align: middle; border-color: inherit">'
                                        +'<tr>'
                                            +'<th>Name</th>';
                        
                        // Adds a enabled time input for each column, with initial value coresponding to user rows
                        for (var i = 0; i < 10; i++) {
                            content += '<th><input type="time" id="t' + i + '" name="t' + i + '" value="' + adminTimes[i] + '" required></th>'
                        }
                        
                        // Adds save time changes btn for the save time changes post form  
                        content +='</tr>'
                                +'<tr>'
                                    +'<th></th>'
                                    +'<th colspan="10"><button type="submit" id="save-times-btn">Save Time Changes</button></th>'
                                +'</tr>'
                            +'</form>'
                            +'<form action="/admin/avail" method="post">';


                        // Adds a row for each user
                        for(r of rows) {
                            // JSON string to json object for users availability times
                            let times = JSON.parse(r.AvailTimes);

                            content += '<tr><td style="text-align: center; width:175px"><input type="text" id="' + r.Name + '-row" value="' + r.Name + '" readonly></td>';

                            // Adds a checkbox for each column (chekced indicates available)
                            for(var i = 0; i < adminTimes.length; i++){
                                // Checks what availability is set to 
                                if(times[`${adminTimes[i]}`]) {
                                    content += '<td style="text-align: center"><input type="checkbox" id="' + r.Name + 'Box' + i + '" name="' + r.Name + 'Box' + i + '" checked="checkced"></td>';
                                } else {
                                    content += '<td style="text-align: center"><input type="checkbox" id="' + r.Name + 'Box' + i + '" name="' + r.Name + 'Box' + i + '"></td>'; //onclick="return false;
                                }
                            }

                            content += '</tr>';
                        }

                        // Adds save availability  btn for the save avail post form
                        content +='<tr>'
                                    +'<th></th>'
                                    +'<th colspan="10"><button type="submit" id="save-avail-btn">Save Availability Changes</button></th>'
                                +'</tr></form></table></div>';

                        // Sends the responce content        
                        res.send(content);
                    }
                });
        conn.end();
    } else {
        // If login failed, send user to home page
        res.redirect("/");
    }
});

// Change availability post
app.post('/admin/avail', (req, res) => {
    let times = []; // The admin times saved in the database (Time originly displayed on admin page)
    let usrs = []; // Stores name and availability for each user in an array
    let updates = []; // Stores the index of availability that is updates in usrs array
    let updateStr = `Update Availability Set LastUpdate = CURRENT_TIME(), AvailTimes = (case Name `; //Update query string

    let conn = newConnection();
    conn.connect();
    
    // Selects the name and availtimes obj from availability. selects Admin entry first
    conn.query( `select Name, AvailTimes from Availability order by Name, case Name when "Admin" then '1' else '2' end`
            , (err,rows,fields) => {
                if (err) {
                    console.log(err);
                    conn.end();
                    res.send("Unkown Error Occured. Update not completed.");
                } else {
                    // Gets array of admin times and removes admin from the rows
                    times = JSON.parse(rows[0].AvailTimes);
                    rows.shift();

                    // Populates the users array with users name and availability times obj
                    for(r of rows) {
                        usrs.push([r.Name, JSON.parse(r.AvailTimes)]);
                    }

                    // Checks if the usrs avail times stored in the db match whats currently displayed
                    for(var i = 0; i < usrs.length; i++) {
                        for(var j = 0; j < 10; j++) {
                            // If the index isnt in the update array and stored avail times dont match displayed
                            if(!updates.includes(i) && !((req.body[`${usrs[i][0] + "Box" + j}`] == "on") == usrs[i][1][`${times[j]}`]) ) {
                                updates.push(i);
                            } 
                            // Updates usr object incase its needed for update statement
                            usrs[i][1][`${times[j]}`] = (req.body[`${usrs[i][0] + "Box" + j}`] == "on");
                        }
                    }

                    // Adds each update requirement to the query string
                    for(u of updates) {
                        updateStr += `When '` + usrs[u][0] + `' then '` + JSON.stringify(usrs[u][1]) + `' `;
                    }

                    updateStr += `Else (AvailTimes) End)`;

                    // If there is an update, update the database
                    if (updates.length > 0) {
                       conn.query(updateStr, (err,rows,fields) => {
                            if(err) {
                                console.log(err);
                                res.send("Could not complete update");
                            } else {
                                res.send('Update Successful');
                            }
                        })
                    } else {
                        //No changes thus no update
                        res.send("No Updates made as no changes were made");
                    }
                    conn.end();
                }
    })
});

// Change time selection
app.post('/admin/time', (req, res) => {
    let newTimes = []; // Stores the new times the admin changed
    let dupValErr = false; //Duplicate value trying to be set error. (Initially no error thus false)

    //Checks to see if duplicate time is trying to be entered
    for (var i = 0; i < 10; i++) {
        if(newTimes.includes(req.body[`${"t" + i}`])) {
            dupValErr = true;
            i = 10; //Breaks loop once error is found
        } 

        // Adds all the times to the array
        newTimes.push(req.body[`${"t" + i}`]);
    }

    newTimes.sort(); //Sorts the times from lowest to highest

    // If no duplicate value error update 
    if (!dupValErr) {
        let conn = newConnection();
        conn.connect();

        // Updates the Admins times
        conn.query( `update Availability set LastUpdate = CURRENT_TIME(), AvailTimes = '` + JSON.stringify(newTimes) + `' where Name = "Admin"`
                , (err,rows,fields) => {
                    if (err) {
                        console.log(err);
                        res.send("Changes not successfully made. Please click the back arrow and retry."); //************************* change to have better direction */
                    } else {
                        res.send("Changes successfully made. Please click the back arrow and refresh the page."); //************************* change to have better direction */
                    }
                });
        conn.end();
    } else {
        res.send("Duplicate values cannot be entered. Please refresh the page and retry.");
    }
});

// Guest availability registration
app.post('/guest/register', (req, res) => {
    // If the guest name is not included in the database already as it is the pk
    if (!(req.body.otherNames).includes(req.body.guestName) || req.body.otherNames) {
        let conn = newConnection();
        conn.connect();

        let newAvail = {}; // New availability entered by the guest

        // Adds a true false value for each availability entry time. Converts checkbox values to true false
        for (var i = 0; i < 10; i++) {
            newAvail[req.body[`${"t" + i}`]] = (req.body[`${"box" + i}`] === "on");
        }

        // Adds the new guest to the database
        conn.query( `insert into Availability values("` + req.body.guestName + `",CURRENT_TIME(),'` + JSON.stringify(newAvail) + `')`
                , (err,rows,fields) => {
                    if (err) {
                        console.log(err);
                        res.send("Availability was not added. Please retry.");
                    } else {
                        res.redirect("/guest"); // Reloads and sends user back to the guest page
                    }
                });
        conn.end(); 
   } else {
       res.send("Duplicate names cannot be added to the availability page. Please enter another variation of your name or ad a sufix/prefix");
   } 
});

// Guest page
app.get('/guest', (req, res) => {
    let conn = newConnection();
    conn.connect();
    let content = '<div><div>Doodle App</div>';

    // Selects all the people in the databese, selects the admin first and sorts alphabetically
    conn.query( `select Name, AvailTimes from Availability order by Name, case Name when "Admin" then '1' else '2' end`
            , (err,rows,fields) => {
                if (err) {
                    console.log(err);
                    res.send("Unknown Error Occured");
                } else {
                    //Gets the admin times and removes the admin from the rows
                    let adminTimes = JSON.parse(rows[0].AvailTimes);
                    rows.shift();

                    content += '<table style="min-width: 100vw; padding: 5px 15px">'
                                    +'<form method="post" action="/guest/register" style="display:table-row-group; vertical-align: middle; border-color: inherit">'
                                        +'<thead>'
                                            +'<tr>'
                                                +'<th>Name</th>';

                    // Adds table head data for each time, uses input types to keep visualy consistent with admin protal
                    for(var i = 0; i < 10; i ++) {
                        content += '<th><input type="time" name="t' + i + '" value="' + adminTimes[i] + '" readonly></th>';
                    }

                    content +='</tr></thead><tbody>';

                    for(r of rows) {
                        let times = JSON.parse(r.AvailTimes); // Parses the availablity to a json object

                        content += '<tr><td style="text-align: center; width:175px"><input type="text" id="' + r.Name + '-row" name="otherNames" value="' + r.Name + '" readonly></td>';

                        // Adds a checkbox for each column that has previous usr entry (chekced indicates available)
                        for(var i = 0; i < adminTimes.length; i++){
                            if(times[`${adminTimes[i]}`]) {
                            content += '<td style="text-align: center"><input type="checkbox" id="' + r.Name + '-box-' + i + '" checked="' + ( (times[`${adminTimes[i]}`]) ? "checked" : "") + '" onclick="return false;"></td>'; // If errors occur check here **************************************
                             } else {
                                content += '<td style="text-align: center"><input type="checkbox" id="' + r.Name + '-box-' + i + '" onclick="return false;"></td>';
                            }
                        }
                        content += '</tr>';
                    }

                    content += '<tr>'
                                    +'<td style="text-align: center; width:175px">'
                                        +'<input type="text" id="guest-name" name="guestName" placeholder="Name" required>'
                                    +'</td>';

                    // Adds a row of check boxes incase the guest would like to enter their availability
                    for(var i = 0; i < 10; i++) {
                        content += '<td style="text-align: center"><input type="checkbox" name="box' + i + '"></td>';
                    }
                
                    // Adds a save guest btn for the form and closes other html elements
                    content += '</tr><tr><td style="text-align:center" colspan=11><button type="submit">Add Availability</button></td></tr></tbody></form></table></div>';

                    res.send(content);
                }
            });
    conn.end();
});

//Hosted on port 2000
app.listen(2000);