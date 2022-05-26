if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt');
const path = require('path');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override')

const initializePassport = require('./passport-config');
const { throws } = require('assert');
const { error } = require('console');
initializePassport(
    passport, 
    name => users.find(user => user.name === name),
    id => users.find(user => user.id === id)
)

// will want to use DB here instead
const users = [];

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(express.urlencoded({extended: false}));
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkAuthenticated, (req, res) => {
    res.redirect('/dashboard');
})

app.get('/dashboard', checkAuthenticated, (req, res) => {
    if(req.user.keys == null){
        return res.redirect('/keygen');
    }
    res.render(path.join(__dirname, '/public','/dashboard','/index.html'), {name: req.user.name, n: req.user.keys.private.n, d: req.user.keys.private.d, e: req.user.keys.public.e });
})

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render(path.join(__dirname, '/public','/login','/index.html'));
})

app.post('/login', checkNotAuthenticated, 
    passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}))

function renderRegisterPage(res, messages){
    res.render(path.join(__dirname, '/public','/register','/index.html'),{ messages:messages});
}

app.get('/register', checkNotAuthenticated,  (req, res) => {
    renderRegisterPage(res, {})
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    if(users.find(user => user.name === req.body.name) != null){
        renderRegisterPage(res, {error: "Name already taken"})
        return;
    }

    if("xxx Coinbase xxx" === req.body.name){
        renderRegisterPage(res, {error: "Name Reserved"})
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        user = {
            id: Date.now().toString(),
            name: req.body.name,
            password: hashedPassword,
            keys:null
        };
        users.push(user);
        req.login(user, function(err) {
            if (err) {
              console.log(err);
            }
            return res.redirect('/keygen');
        });
    } catch {
        renderRegisterPage(res, {error: "There Has Been an error"})
        return;
    }
    // console.log(users);
    
})

app.get('/publickeys', (req, res) => {
    const keys = [];

    users.forEach(user => {
        if(user.keys != null)
            keys.push({
                name:user.name,
                key: user.keys.public
            })
    });

    res.send(keys);
})

app.get('/keygen', checkAuthenticated, (req, res) => {
    if(req.user.keys != null){
        return res.redirect('/dashboard');
    }
    res.render(path.join(__dirname, '/public','/keygen','/index.html'), {name: req.user.name});
})

app.post('/keygen', checkAuthenticated, async (req, res) => {
    if(req.user.keys == null){
        req.user.keys = {
            public:{
                e:req.body.e,
                n:req.body.n
            },
            private:{
                d:req.body.d,
                n:req.body.n
            }
        }
        io.emit('new-user', {
            name: req.user.name,
            key: req.user.keys.public
        });
    }
    console.log(users);
    return res.redirect('/dashboard');
})

// share static resources (cant use public resource because ejs)
{
    app.get('/dashboard/style', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/dashboard','/style.css'));
    })
    app.get('/dashboard/script', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/dashboard','/script.js'));
    })

    app.get('/login/style', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/login','/style.css'));
    })
    app.get('/login/script', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/login','/script.js'));
    })

    app.get('/register/style', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/register','/style.css'));
    })
    app.get('/register/script', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/register','/script.js'));
    })

    app.get('/keygen/style', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/keygen','/style.css'));
    })
    app.get('/keygen/script', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/keygen','/script.js'));
    })

    app.get('/scripts/cryptobigint', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/scripts','/cryptobigint.js'));
    })

    app.get('/img/arrow', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/img','/arrow.png'));
    })
    app.get('/img/coin', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/img','/coin.png'));
    })
    app.get('/img/github_logo', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/img','/github_logo.png'));
    })
    app.get('/img/signatureImage', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/img','/signatureImage.JPG'));
    })
    app.get('/img/verificationImage', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/img','/verificationImage.JPG'));
    })
    app.get('/img/crossmark', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/img','/crossmark.png'));
    })
    app.get('/img/checkmark', (req, res) => {
        res.sendFile(path.join(__dirname, '/public','/img','/checkmark.png'));
    }) 
}

app.delete('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
      });
})

function checkAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return next();
    }

    res.redirect('/login'); 
}

function checkNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return res.redirect('/dashboard'); 
    }
    next();
}

const port = process.env.PORT || 8090;
const server = app.listen(port, () => console.log("listening on port " + port))
const io = require('socket.io')(server, {cors: {origin: '*'}})

io.on('connection', (socket) => {
    console.log("USER CONNECTED", socket.id);

    socket.on('new-transaction', (data) => {
        socket.emit('new-transaction', data);
        socket.broadcast.emit('new-transaction', data);
    })

    
    socket.on('invalid-transaction', (data) => {
        socket.broadcast.emit('invalid-transaction', data);
    })

    socket.on('mined-block', (data) => {
        socket.emit('mined-block', data);
        socket.broadcast.emit('mined-block', data);
    })
})

/*
socket.broadcast.emit('new-transaction', {
            name: req.user.name,
            key: req.user.keys.public
        });
        */