const express = require('express');
const app = express();
const path = require('path');

const passport = require('./server_modules/passport');
const profileRoute = require('./server_modules/routes/profile');
const bodyParser = require('body-parser');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('client'));


app.use('/google', passport(app));
app.use('/profile', profileRoute);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.get('/', function (req, res) {
    console.log(req.session);
    let loggedIn = req.isAuthenticated() && req.user.extra === undefined;
    res.render('search', { loggedIn: loggedIn });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, function () {
    console.log(`Server started on Port ${PORT}`);
});