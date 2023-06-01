const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// mongo
mongoose.connect('mongodb://localhost/myapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Failed mongo connection'));
db.once('open', () => {
    console.log('Connected to mongo');
});


// user
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});
const User = mongoose.model('User', userSchema);


// book
const bookSchema = new mongoose.Schema({
    title: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});
const Book = mongoose.model('Book', bookSchema);


// auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, 'secret_key', (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
}


const app = express();
app.use(express.json());


app.post('/users', (req, res) => {
    const user = new User(req.body);
    user.save((err, savedUser) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).json(savedUser);
        }
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    User.findOne({ email, password }, (err, user) => {
        if (err || !user) {
            return res.sendStatus(401);
        }

        const token = jwt.sign({ id: user._id, email: user.email }, 'secret_key');
        res.json({ token });
    });
});

app.get('/users', authenticateToken, (req, res) => {
    User.find({}, (err, users) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(users);
        }
    });
});

app.post('/books', authenticateToken, (req, res) => {
    req.body.user = req.user.id;
    const post = new Book(req.body);
    post.save((err, savedPost) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(201).json(savedPost);
        }
    });
});

app.get('/books', authenticateToken, (req, res) => {
    Book.find({})
        .populate('user')
        .exec((err, books) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.json(books);
            }
        });
});

app.put('/books/:id', authenticateToken, (req, res) => {
    const bookId = req.params.id;
    Book.findByIdAndUpdate(bookId, req.body, { new: true }, (err, updatedBook) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(updatedBook);
        }
    });
});

app.delete('/books/:id', authenticateToken, (req, res) => {
    const bookId = req.params.id;
    Book.findByIdAndDelete(bookId, (err, deletedBook) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(deletedBook);
        }
    });
});

// Порт, на якому буде працювати сервер
const port = 3000;
app.listen(port, () => {
    console.log(`Server runs on port ${port}`);
});
