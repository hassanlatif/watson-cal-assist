/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

//other dependencies to use SSO
var passport = require('passport');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;

// create a new express server
var app = express();
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
   done(null, user);
});

passport.deserializeUser(function(obj, done) {
   done(null, obj);
});


var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
var ssoConfig = services.SingleSignOn[0];
var client_id = ssoConfig.credentials.clientId;
var client_secret = ssoConfig.credentials.secret;
var authorization_url = ssoConfig.credentials.authorizationEndpointUrl;
var token_url = ssoConfig.credentials.tokenEndpointUrl;
var issuer_id = ssoConfig.credentials.issuerIdentifier;
var callback_url = 'https://watson-cal-assist.mybluemix.net/auth/sso/callback';

var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;
var Strategy = new OpenIDConnectStrategy({
        authorizationURL : authorization_url,
        tokenURL : token_url,
        clientID : client_id,
        scope: 'email',
        response_type: 'code',
        clientSecret : client_secret,
        callbackURL : callback_url,
        skipUserProfile: true,
        issuer: issuer_id
    }, function(accessToken, refreshToken, profile, done) {
        process.nextTick(function() {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        done(null, profile);
    });
});

passport.use(Strategy);
app.get('/login', passport.authenticate('openidconnect', {}));

function ensureAuthenticated(req, res, next) {
    if(!req.isAuthenticated()) {
        req.session.originalUrl = req.originalUrl;
        res.redirect('/login');
    } else {
        return next();
    }
}


app.get('/auth/sso/callback', function(req, res, next) {               
    var redirect_url = req.session.originalUrl;                
    passport.authenticate('openidconnect', {
        successRedirect: '/hello',                                
        failureRedirect: '/failure',                        
    })(req,res,next);
});

app.get('/hello', ensureAuthenticated, function(req, res) {
	console.log('---------------- User Start -----------------');
	console.log(req.user);
	console.log('---------------- User End -------------------');
    res.send('Hello, '+ req.session.user['id'] + '!\n' + '<a href="/logout">Log Out</a>');
});	

app.get('/logout', function(req, res){
    req.logout();
    //res.redirect('/');

     res.redirect('https://' + issuer_id +
                  '/idaas/mtfim/sps/idaas/logout');
});

app.get('/failure', function(req, res) {
    res.send('Login failed');
});



/*Boiler code start//
// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
//Boiler code end*/


app.get('/', function (req, res) {
    res.send('<h1>Bluemix Service: Single Sign On</h1>' + '<p>Sign In with a Social Identity Source (SIS): Cloud directory, Facebook, Google+ or LinkedIn.</p>' + '<a href="/auth/sso/callback">Sign In with a SIS</a>');
});

var appEnv = cfenv.getAppEnv();

app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});


