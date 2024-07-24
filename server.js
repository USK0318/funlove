const express = require('express');
const app = express();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require("dotenv").config();

const port1 = 6001;

app.use(cors({
    origin: '*',
    credentials: true
  }));

const connection = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    port: process.env.databaseport
});

app.use(express.json());

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to the database');
});


const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, 'saikiran', (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

app.post('/', (req, res) => {
    const email1 = req.body.email;
    const password1 = req.body.password;
    connection.query('SELECT * FROM Ecomers.massages_user WHERE email = ?;', [email1], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Internal Server Error or Database connection Error' });
            return;
        }
        if (results.length > 0) {
            const isPasswordCorrect = bcrypt.compareSync(password1, results[0].password);
            if (isPasswordCorrect) {
                const token = jwt.sign({ userId: results[0].id }, 'saikiran', { expiresIn: '100h' });
                res.json({ token: token, user: results[0].username });
            } else {
                res.status(401).json({ error: 'Invalid Password' });
            }
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});


app.post('/send', authenticateToken, (req, res) => {
    const userRole = req.headers['username']; // Assumes the user role is sent in the 'username' header

    connection.query('SELECT * FROM Ecomers.massage WHERE id = 1;', (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ error: 'Internal Server Error or Database connection Error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Message record not found' });
        }
        const message = results[0].massage;
        const messageId = 1;
        let x;

        if (userRole === 'king') {
            x = '$';
        } else if (userRole === 'Queen') {
            x = '#';
        }

        if (x) {
            const newMessage = `${message}^${x}${req.body.message}`;

            connection.query('UPDATE massage SET massage = ? WHERE id = ?;', [newMessage, messageId], (err, results) => {
                if (err) {
                    console.error('Error executing query:', err);
                    return res.status(500).json({ error: 'Internal Server Error or Database connection Error' });
                }
                res.json({ data: results });
            });
        } else {
            res.status(400).json({ error: 'Invalid user role' });
        }
    });
});

  

app.get('/receive', (req, res) => {
    connection.query('SELECT * FROM Ecomers.massage;', (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Internal Server Error or Database connection Error' });
            return;
        }
        if (results.length > 0) {
            const messages = results[0].massage.split('^').map((message) => ({
                id: message.charAt(0),
                msg: message.slice(1)
            }));
            res.json(messages);
        } else {
            res.json([]);
        }
    });
});

const server = require('http').createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

app.use(express.json());

//... rest of the server-side code...

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Handle incoming message from client
  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    // Broadcast message to all connected clients
    wss.clients.forEach((client) => {
      if (client!== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('Error occurred:', error);
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});


app.listen(port1, () => {
    console.log(`Server started on port ${port1}`);
});
