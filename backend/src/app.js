var fs = require('fs');
var app = require('express')();

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
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var acl = require('./lib/auth').acl;
var utils = require('./lib/utils');

// Get configuration
var env = process.env.NODE_ENV || 'dev';
var config = require('./config/config.json')[env];
global.__basedir = __dirname;

// Database connection
var mongoose = require('mongoose');
// Use native promises
mongoose.Promise = global.Promise;
// Trim all Strings
mongoose.Schema.Types.String.set('trim', true);

mongoose.connect(`mongodb://${config.database.server}:${config.database.port}/${config.database.name}`, {});

// Models import
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

// Socket IO configuration
io.on('connection', (socket) => {
  let jwt = socket.handshake.headers.cookie.match(/token=(JWT[^;]+)/);
  if(jwt == null) {
    socket.disconnect();
    return;
  }
  if(jwt.length != 2) {
    socket.disconnect();
    return;
  }
  jwt = jwt[1];
  if(!acl.hasPermission("websocket:connect", jwt)) {
    socket.disconnect();
    return;
  }
  socket.on('join', (data) => {
    console.log(`user ${data.username.replace(/\n|\r/g, "")} joined room ${data.room.replace(/\n|\r/g, "")}`)
    socket.username = data.username;
    do { socket.color = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6); } while (socket.color === "#77c84e")
    socket.join(data.room);
    io.to(data.room).emit('updateUsers');
  });
  socket.on('leave', (data) => {
    console.log(`user ${data.username.replace(/\n|\r/g, "")} left room ${data.room.replace(/\n|\r/g, "")}`)
    socket.leave(data.room)
    io.to(data.room).emit('updateUsers');
  })
  socket.on('updateUsers', (data) => {
    var userList = [...new Set(utils.getSockets(io, data.room).map(s => {
      var user = {};
      user.username = s.username;
      user.color = s.color;
      user.menu = s.menu;
      if (s.finding) user.finding = s.finding;
      if (s.section) user.section = s.section;
      return user;
    }))];
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

app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({
  limit: '10mb',
  extended: false // do not need to take care about images, videos -> false: only strings
}));

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

app.get("*", function(req, res) {
    res.status(404).json({"status": "error", "data": "Route undefined"});
})

// Start server

https.listen(config.port, config.host)

module.exports = app;
