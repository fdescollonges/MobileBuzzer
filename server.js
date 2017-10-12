// load dependencies
var Cloudant = require('cloudant');
var express = require('express');
var http = require('http');
var path = require('path');
var _s = require('underscore.string');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var password;

var me = 'd601f780-c71f-485e-97ad-b2034aa48ae1-bluemix'; // Set this to your own account
var password = process.env.cloudant_password;
var cloudant = Cloudant({ account: me, password: password });
cloudant.db.list(function(err, allDbs) {
    console.log('All my databases: %s', allDbs.join(', '))
});
var mobilebuzzerbd = cloudant.db.use('mobilebuzzer');

var callbackdb = function(err, data) {
    if (err) {
        return console.log('[mobilebuzzerdb]', err.message);
    } else {
        return console.log('[mobilebuzzerdb]', data);
    }
}

var instertPlayer = function(name, cb) {
    mobilebuzzerbd.insert({ "_in": name, "score": 0, "buzz": 0 }, cb);
}

insertPlayer("iphone5", callbackdb);
insertPlayer("iphone7", callbackdb);

// get the admin password
if (process.argv.length != 3) {
    if (typeof process.env.GAME_PASSWORD === 'undefined' || process.env.GAME_PASSWORD == null) {
        process.stderr.write('Info - GAME_PASSWORD environment variable must be set or a password must be passed as parameter at startup \n');
    } else {
        password = process.env.GAME_PASSWORD;
    }
} else {
    password = process.argv[2];
}

var admin_token = Math.random() + '.' + Math.random() + '.' + Math.random() + '.' + Math.random();

// all environments
app.set('port', process.env.PORT || 1977);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.locals.pretty = true;

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}
// In Cloudant database
var initialize_playerDB = function(name) {}

// in-memory database
players = {};
admin_socket = null;
var emit_players = function() {
    if (admin_socket) {
        //admin_socket.emit
        io.sockets.emit('players', players);
    }
};
var initialize_player = function(name) {
    if (!(name in players)) {
        players[name] = {
            score: 0,
            buzzes: 0
        };
    }
};

// routes
app.get('/', function(req, res) {
    res.render('index', { title: 'Index' });
});

app.get('/play', function(req, res) {
    var name = _s.trim(req.query.name || '');
    if (!name) {
        res.redirect('/');
        return;
    }

    initialize_player(name);
    emit_players();
    res.render('play', { title: 'Play', name: name });
});

app.get('/display', function(req, res) {
    res.render('display', { title: 'Display' });
});


app.post('/buzz', function(req, res) {
    if (!admin_socket) {
        res.send(400, 'Attendez l\'admin ;)');
        return;
    }

    // update the player's buzz count
    var name = req.body.name;
    initialize_player(name);
    players[name].buzzes++;

    // notify the administrator
    //admin_socket.emit
    io.sockets.emit('buzz_admin', {
        name: name
    });
    //admin_socket.emit
    io.sockets.emit('buzz_display', {
        name: name
    });
    emit_players();

    res.send(200);
})

app.get('/admin-auth', function(req, res) {
    res.render('admin-auth', { title: 'Admin Auth' });
});

app.post('/admin-auth', function(req, res) {
    console.log(req.body.password, password);
    if (req.body.password == password) {
        res.cookie('admin_token', admin_token);
        res.redirect('/admin');
    } else {
        res.redirect('/admin-auth');
    }
});

app.get('/admin', function(req, res) {
    if (req.cookies.admin_token != admin_token) {
        res.redirect('/admin-auth');
        return;
    }
    res.render('admin', { title: 'Admin', players: players });
});

// socket.io
io.sockets.on('connection', function(socket) {
    admin_socket = socket;
    socket.on('disconnect', function() {
        admin_socket = null;
    });
    socket.on('score', function(data) {
        if (data.name in players) {
            players[data.name].score += data.score;
            emit_players();
        }
    });
    socket.on('delete', function(data) {
        if (data.name in players) {
            delete players[data.name];
            emit_players();
        }
    });
    emit_players();
});

// start
server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});