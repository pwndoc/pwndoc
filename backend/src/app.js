var fs = require('fs');
var express = require('express');
var app = express();

var https = require('https').Server({
  key: fs.readFileSync(__dirname+'/../ssl/server.key'),
  cert: fs.readFileSync(__dirname+'/../ssl/server.cert'),

  // TLS Versions
	maxVersion: 'TLSv1.3',
	minVersion: 'TLSv1.2',

	// Hardened configuration
	ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384',

	honorCipherOrder: false
}, app);
app.disable('x-powered-by');

var io = require('socket.io')(https, {
  cors: {
    origin: "*"
  }
})
var cookieParser = require('cookie-parser')
var utils = require('./lib/utils');
const config = require('./config/config.json');
const env = process.env.NODE_ENV || 'dev';
const reservedUserColor = '#77c84e';

function getSocketUserColor() {
  var color;
  do {
    color = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
  } while (utils.colorDistance(color, reservedUserColor) < 120)
  return color;
}

// Get configuration
global.__basedir = __dirname;

// Database connection
var mongoose = require('mongoose');
// Trim all Strings
mongoose.Schema.Types.String.set('trim', true);

let connectionOptions = {};
if (config && config[env] && config[env].database && config[env].database.connectionOptions) {
  connectionOptions = config[env].database.connectionOptions;
}

var dbConnection;

if (process.env.MONGODB_URI) {
  dbConnection = mongoose.connect(process.env.MONGODB_URI, connectionOptions);
} else {
  dbConnection = mongoose.connect(`mongodb://${process.env.DB_SERVER}:27017/${process.env.DB_NAME}`, connectionOptions);
}

// Models import
var modelDefaults = require('./lib/model-defaults');
require('./models/user');
require('./models/audit');
require('./models/client');
require('./models/company');
require('./models/template');
require('./models/vulnerability');
require('./models/vulnerability-update');
require('./models/language');
require('./models/audit-type');
require('./models/vulnerability-type');
require('./models/vulnerability-category');
require('./models/custom-section');
require('./models/custom-field');
require('./models/image');
require('./models/settings');
require('./models/dictionary');
require('./models/languagetool-rule');

// Socket IO configuration
io.on('connection', (socket) => {
  socket.on('join', (data) => {
    console.log(`user ${data.username.replace(/\n|\r/g, "")} joined room ${data.room.replace(/\n|\r/g, "")}`)
    socket.username = data.username;
    socket.color = getSocketUserColor();
    socket.join(data.room);
    io.to(data.room).emit('updateUsers');
  });
  socket.on('leave', (data) => {
    console.log(`user ${data.username.replace(/\n|\r/g, "")} left room ${data.room.replace(/\n|\r/g, "")}`)
    socket.leave(data.room)
    io.to(data.room).emit('updateUsers');
  })
  socket.on('updateUsers', (data) => {
    var usersByUsername = new Map();
    utils.getSockets(io, data.room).forEach(s => {
      if (!s.username)
        return;

      var user = usersByUsername.get(s.username);
      if (!user) {
        user = {};
        user.username = s.username;
        user.color = s.color;
        user.sessions = [];
        usersByUsername.set(s.username, user);
      }

      var session = {};
      session.color = s.color;
      session.menu = s.menu;
      user.menu = s.menu;
      if (s.finding) user.finding = s.finding;
      else delete user.finding;
      if (s.section) user.section = s.section;
      else delete user.section;
      if (s.finding) session.finding = s.finding;
      if (s.section) session.section = s.section;
      user.sessions.push(session);
    });
    var userList = Array.from(usersByUsername.values());
    io.to(data.room).emit('roomUsers', userList);
  })
  socket.on('menu', (data) => {
    socket.menu = data.menu;
    (data.finding)? socket.finding = data.finding: delete socket.finding;
    (data.section)? socket.section = data.section: delete socket.section;
    io.to(data.room).emit('updateUsers');
  })
  socket.on('disconnect', () => {
    socket.broadcast.emit('updateUsers')
  })
});

// CORS
app.use(function(req, res, next) {
  // res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Expose-Headers', 'Content-Disposition')
  // res.header('Access-Control-Allow-Credentials', 'true')
  next();
});

// CSP
app.use(function(req, res, next) {
  res.header("Content-Security-Policy", "default-src 'none'; form-action 'none'; base-uri 'self'; frame-ancestors 'none'; sandbox; require-trusted-types-for 'script';");
  next();
});

app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({
  limit: '10mb',
  extended: false // do not need to take care about images, videos -> false: only strings
}));

// Ensure req.body is always an object (not null/undefined) to prevent crashes
// We may want to remove this once all methods support null object checks
app.use(function(req, res, next) {
    if (req.body === null || req.body === undefined) {
        req.body = {};
    }
    next();
});

app.use(cookieParser())

// Routes import
require('./routes/user')(app);
require('./routes/audit')(app, io);
require('./routes/client')(app);
require('./routes/company')(app);
require('./routes/vulnerability')(app);
require('./routes/template')(app);
require('./routes/vulnerability')(app);
require('./routes/data')(app);
require('./routes/image')(app);
require('./routes/settings')(app);
require('./routes/backup')(app);
require('./routes/test-utils')(app);
require('./routes/spellcheck')(app);
require('./routes/languagetool-rules')(app);

app.all(/(.*)/, function(req, res) {
    res.status(404).json({"status": "error", "data": "Route undefined"});
})

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something went wrong. Please contact your administrator.')
})

// Start server

dbConnection
.then(() => {
    return modelDefaults.ensureModelDefaults();
})
.then(() => {
    https.listen(4242, () => {
        const { syncRulesToLanguageTool } = require('./lib/languagetool-sync');

        syncRulesToLanguageTool().catch(err => {
            console.warn('LanguageTool startup sync failed (non-blocking):', err.message);
        });
    });
})
.catch((err) => {
    console.error('Backend startup failed:', err);
    process.exit(1);
});
module.exports = app;
