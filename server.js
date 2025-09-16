const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const nodemailer = require('nodemailer'); // Fixed the typo here

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Email configuration (replace with your actual email credentials)
const transporter = nodemailer.createTransport({ 
  service: 'gmail', // or your email service
  auth: {
    user: 'youremail@gmail.com', // replace with your email
    pass: 'yourpassword' // replace with your email password or app password
  }
});

// Initialize SQLite database
const db = new sqlite3.Database('./restaurant.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables with serial execution
function initializeDatabase() {
    // Create menu table
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image TEXT
    )`, function(err) {
        if (err) {
            console.error('Error creating menu table:', err);
            return;
        }
        console.log('Menu table created or already exists');
        
        // Create reservations table
        db.run(`CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            guests INTEGER NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'confirmed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, function(err) {
            if (err) {
                console.error('Error creating reservations table:', err);
                return;
            }
            console.log('Reservations table created or already exists');
            
            // Create orders table
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                items TEXT NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, function(err) {
                if (err) {
                    console.error('Error creating orders table:', err);
                    return;
                }
                console.log('Orders table created or already exists');
                
                // Create contact_messages table
                db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, function(err) {
                    if (err) {
                        console.error('Error creating contact_messages table:', err);
                        return;
                    }
                    console.log('Contact messages table created or already exists');
                    
                    // Check if menu is empty and insert sample data
                    checkAndPopulateMenu();
                });
            });
        });
    });
}

function checkAndPopulateMenu() {
    db.get("SELECT COUNT(*) as count FROM menu", (err, row) => {
        if (err) {
            console.error('Error checking menu count:', err);
            return;
        }
        
        if (row && row.count === 0) {
            console.log('Menu table is empty, inserting sample data...');
            const sampleMenu = [
                {
                    name: "Grilled Salmon",
                    description: "Fresh Atlantic salmon with lemon butter sauce, served with seasonal vegetables",
                    price: 24.99,
                    image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                    name: "Filet Mignon",
                    description: "8oz premium beef tenderloin with red wine reduction and garlic mashed potatoes",
                    price: 32.99,
                    image: "https://images.unsplash.com/photo-1546964124-0cce460f38ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                    name: "Mushroom Risotto",
                    description: "Creamy arborio rice with wild mushrooms and parmesan cheese",
                    price: 18.99,
                    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                    name: "Caprese Salad",
                    description: "Fresh mozzarella, tomatoes, and basil with balsamic glaze",
                    price: 10.99,
                    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                },
                {
                    name: "Chocolate Lava Cake",
                    description: "Warm chocolate cake with a molten center, served with vanilla ice cream",
                    price: 8.99,
                    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                },
                {
                    name: "Tiramisu",
                    description: "Classic Italian dessert with layers of coffee-soaked ladyfingers and mascarpone cream",
                    price: 7.99,
                    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                }
            ];

            const stmt = db.prepare("INSERT INTO menu (name, description, price, image) VALUES (?, ?, ?, ?)");
            sampleMenu.forEach(item => {
                stmt.run(item.name, item.description, item.price, item.image, function(err) {
                    if (err) {
                        console.error('Error inserting menu item:', err);
                    }
                });
            });
            stmt.finalize((err) => {
                if (err) {
                    console.error('Error finalizing statement:', err);
                } else {
                    console.log('Sample menu items added to database');
                }
            });
        } else {
            console.log('Menu table already has data');
        }
    });
}

// Routes

// GET /api/menu - Get all menu items
app.get('/api/menu', (req, res) => {
    db.all("SELECT * FROM menu", (err, rows) => {
        if (err) {
            console.error('Error fetching menu:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST /api/reservations - Create a new reservation
app.post('/api/reservations', (req, res) => {
    const { name, email, phone, date, time, guests, message } = req.body;
    
    // Basic validation
    if (!name || !email || !phone || !date || !time || !guests) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const sql = `INSERT INTO reservations (name, email, phone, date, time, guests, message) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, email, phone, date, time, guests, message || ''];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error creating reservation:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({
            id: this.lastID,
            name,
            email,
            phone,
            date,
            time,
            guests,
            message: message || '',
            status: 'confirmed'
        });
    });
});

// POST /api/orders - Create a new order
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_email, customer_phone, items, total_amount } = req.body;
    
    // Basic validation
    if (!customer_name || !customer_email || !customer_phone || !items || !total_amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const sql = `INSERT INTO orders (customer_name, customer_email, customer_phone, items, total_amount) VALUES (?, ?, ?, ?, ?)`;
    const params = [customer_name, customer_email, customer_phone, JSON.stringify(items), total_amount];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error creating order:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        
        // Send email notification to admin
        const mailOptions = {
            from: customer_email,
            to: 'admin@example.com', // Replace with admin email
            subject: `New Order #${this.lastID} from ${customer_name}`,
            html: `
                <h2>New Order Received</h2>
                <p><strong>Order ID:</strong> #${this.lastID}</p>
                <p><strong>Customer:</strong> ${customer_name}</p>
                <p><strong>Email:</strong> ${customer_email}</p>
                <p><strong>Phone:</strong> ${customer_phone}</p>
                <p><strong>Total Amount:</strong> $${total_amount}</p>
                <h3>Order Items:</h3>
                <ul>
                    ${items.map(item => `<li>${item.name} - $${item.price} x ${item.quantity}</li>`).join('')}
                </ul>
            `
        };
        
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        
        res.status(201).json({
            id: this.lastID,
            customer_name,
            customer_email,
            customer_phone,
            items,
            total_amount,
            status: 'pending'
        });
    });
});

// POST /api/contact - Handle contact form submissions
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    
    // Basic validation
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Save to database
    const sql = `INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)`;
    const params = [name, email, message];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving contact message:', err);
            res.status(400).json({ error: err.message });
            return;
        }
        
        // Send email to admin
        const mailOptions = {
            from: email,
            to: 'admin@example.com', // Replace with admin email
            subject: `New Contact Message from ${name}`,
            html: `
                <h2>New Contact Message</h2>
                <p><strong>From:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };
        
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                res.status(500).json({ error: 'Failed to send message' });
            } else {
                console.log('Email sent: ' + info.response);
                res.status(201).json({ 
                    success: true, 
                    message: 'Your message has been sent successfully!' 
                });
            }
        });
    });
});

// GET /api/reservations - Get all reservations (for admin purposes)
app.get('/api/reservations', (req, res) => {
    db.all("SELECT * FROM reservations ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            console.error('Error fetching reservations:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  // Simple password check (in production, use proper authentication)
  if (password === '1234') {
    res.json({ success: true, message: 'Admin access granted' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid admin password' });
  }
});

// GET /admin - Serve the admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// GET /api/admin/reservations - Get all reservations for admin
app.get('/api/admin/reservations', (req, res) => {
  db.all("SELECT * FROM reservations ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      console.error('Error fetching reservations:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET /api/admin/orders - Get all orders for admin
app.get('/api/admin/orders', (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET /api/admin/contacts - Get all contact messages for admin
app.get('/api/admin/contacts', (req, res) => {
  db.all("SELECT * FROM contact_messages ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      console.error('Error fetching contact messages:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET / - Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});