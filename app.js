/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const { User, Todo, Appointments } = require("./models");
const csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const path = require("path");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Here is the Key"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(session());
app.use(flash());
// app.use(csrf("this_should_be_32_character_long"));

// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-super-secert-key-1234654567987",
    cookie: {
      maxAge: 24 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Invalid Username" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializeing user in session ", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async function (request, response) {
  console.log("Get")  
  request.flash("info", "Welcome to Appointment Schedular site!");
  response.render("index", {
    csrfToken: request.csrfToken(),
    appointments: await Appointments.findAll(),
  });
});

app.post("/", async function (request, response) {
  try {
    const name = request.body.eventName;
    const startTime = request.body.startTime;
    const endTime = request.body.endTime;
    console.log("Post")
    if(name.length===0 || startTime===null || endTime===null){
      console.log(name, " ", startTime, " ", endTime)
      request.flash("error", "Fields Must not be Emtpy!");
      return response.redirect("/");
    }
    if(startTime > endTime) {
      request.flash("error", "Start Time must be less than End time!");
      return response.redirect("/");
    }
    await Appointments.destroy({where : {name: null}});
    await Appointments.create({
      name, startTime, endTime,
    })
    request.flash("success", "Appointment Scheduled Successfully!");
    return response.redirect("/");
  } catch (error) {
    console.log("Error!");
    return response.redirect("/");
  }
});
module.exports = app;
