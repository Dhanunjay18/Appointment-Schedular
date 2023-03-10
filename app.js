/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const { Users, Appointments } = require("./models");
const { Op } = require("sequelize");
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
const { start } = require("repl");
const { time } = require("console");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Here is the Key"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(session()); 
app.use(flash());

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
      Users.findOne({ where: { email: username } })
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
  Users.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const firstNameSize = Object.keys(request.body.firstName).length;
    const lastNameSize = Object.keys(request.body.lastName).length;
    const emailSize = Object.keys(request.body.email).length;
    const passwordSize = Object.keys(request.body.password).length;
    if (
      firstNameSize == 0 ||
      lastNameSize === 0 ||
      emailSize == 0 ||
      passwordSize === 0
    ) {
      request.flash("error", "The fields must not be empty!");
      return response.redirect("/signup");
    }
    const chk = await Users.findOne({ where: { email: request.body.email } });
    // console.log("check => ", chk)
    if (chk != null) {
      request.flash("error", "Email ALready exits");
      return response.redirect("/signup");
    }
    const user = await Users.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      return response.redirect("/appointments");
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/", async function (request, response) {
  response.render("index", {
    csrfToken: request.csrfToken(),
  });
});

app.get("/signout", async (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    return response.redirect("/");
  });
});

app.get("/login", async (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});


app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/appointments");
  }
);


app.get("/appointments",connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  const successMessage = request.flash('success')[0];
  const u = await Users.findOne({where : {id : request.user.id }});
  console.log(successMessage)
  response.render("appointments", {
    csrfToken: request.csrfToken(),
    appointments: await Appointments.findAll({
      order: [
        ['startTime'],
      ],
      where : {
        uid : u.id,
      }
    }),
    successMessage: successMessage, 
    userName : u.firstName + " " + u.lastName,
    uid : u.id,
  });
});

app.post("/appointments",connectEnsureLogin.ensureLoggedIn(), async function (request, response) {
  try {
    const name = request.body.eventName;
    const startTime = request.body.startTime;
    const endTime = request.body.endTime;
    const startTime1 = Number(startTime.split(":")[0]) * 60 + Number(startTime.split(":")[1]);
    const endTime1 = Number(endTime.split(":")[0]) * 60 + Number(endTime.split(":")[1]);
    if(name.length===0 || startTime===null || endTime===null){
      console.log(name, " ", startTime, " ", endTime)
      request.flash("error", "Fields Must not be Emtpy!");
      return response.redirect("/appointments");
    }
    if(startTime >= endTime) {
      request.flash("error", "Start Time must be less than End time!");
      return response.redirect("/appointments");
    }
    const uid = request.user.id;
    const chk1 = await Appointments.findAll({where : {uid: uid, name: name}});
    if(chk1.length!=0) {
      request.flash("error", "An appointment is already scheduled with the same name!");
      return response.redirect("/appointments");      
    }
    console.log("User ID : ", uid);
    const chk = await Appointments.findAll({
      where: {
        startTime: { [Op.lt]: endTime },
        endTime: { [Op.gt]: startTime },
        uid : uid,
      },
      
    });
    /*
      (("Appointments"."startTime" = '21:14' AND "Appointments"."endTime" = '21:20') OR ("Appointments"."startTime" > '21:14' AND "Appointments"."startTime" < '21:20') OR ("Appointments"."endTime" > '21:14' AND "Appointments"."endTime" < '21:20')) AND "Appointments"."uid" = 11;
      10.00 - 10.15

          9.50-10.00(Done)
          9.50-10.05(Done)
          9.50-10.15(Done)
          9.50-10.20(Done)
          10.00 - 10.15(Done)

          10.05-10.20(Done)
          10.05-10.10(Done)
          10.00-10.20(Done)
          10.15-10.20(Done)
  */
    console.log("*********************************Duration : ", startTime1, "     ", endTime1)
    if(chk.length!=0){
      var msg = "Sorry! Provided Time Period is Clashing with Appointment Names : [ ";
      var maxEnd = 0;
        for(var i=0; i<chk.length; ++i) {
          msg += chk[i].name + ", ";
          maxEnd = Math.max(maxEnd, Number(chk[i].endTime.split(":")[0]) * 60 + Number(chk[i].endTime.split(":")[1]))
        }
        msg += "]. Deletion of these Appointments enables you to schedule current Appointment."
        request.flash("error", msg);

        // Suggesting best time slot
        const duration = endTime1 - startTime1;
        msg = "";
        for(i=startTime1; i<=1440-duration; i++) {
            const st1 = Math.floor(i/60) + ":" + (i%60) + ":00";
            const et1 = Math.floor((i+duration)/60) + ":" + ((i+duration)%60) + ":00";
            console.log(st1, "           ", et1);
            const chk = await Appointments.findAll({
              where: {
                startTime: { [Op.lt]: et1 },
                endTime: { [Op.gt]: st1 },
                uid : uid,
              },
            });
            if(chk.length==0){
              msg += st1 + " to " + et1 + " Lately or "
              console.log("***************************8**************You can schedule the nearest time slot : " + st1 + " to " + et1);
              break;
            }
        }
        for(i=endTime1; i>=duration; i--) {
          const et1 = Math.floor(i/60) + ":" + (i%60) + ":00";
          const st1 = Math.floor((i-duration)/60) + ":" + ((i-duration)%60) + ":00";
          console.log(st1, "           ", et1);
          const chk = await Appointments.findAll({
            where: {
              startTime: { [Op.lt]: et1 },
              endTime: { [Op.gt]: st1 },
              uid : uid,
            },
          });
          if(chk.length==0){
            msg += st1 + " to " + et1 + " Early!"
            console.log("***************************8**************You can schedule the nearest time slot : " + st1 + " to " + et1);
            break;
          }
      }
      request.flash("info", "You can schedule the next nearest available time slot with same duration : " + msg);
      return response.redirect("/appointments");
      }
    await Appointments.create({
      name, startTime, endTime, uid : uid,
    })
    request.flash("success", "Appointment Scheduled Successfully!");
    return response.redirect("/appointments");
  } catch (error) {
    console.log(error)
    request.flash("error", "Provide Start and End Time Properly!");
    return response.redirect("/appointments");
  }
});

app.get('/appointments/:id/edit',connectEnsureLogin.ensureLoggedIn(), async (req, res) => {  
  const appointment = await Appointments.findOne({where : {id: req.params.id}});
  // console.log(req.body._csrf);
  res.render('editAppointment', { 
    id: req.params.id, 
    currName: appointment.name,
    csrfToken: req.csrfToken(), 
    messages: req.flash('info') 
  });
});

app.post('/appointments/:id/edit',connectEnsureLogin.ensureLoggedIn(), async (request, response) => {
  try {
    console.log("Came to put")
    console.log(request.body.newName)
    if(request.body.oldName === request.body.newName){
      request.flash('error', 'Enter the new Name which should not match with Old name');
      return response.redirect("/appointments");  
    }
    const uid = request.user.id;
    console.log(uid)
    const chk1 = await Appointments.findAll({where : {uid: uid, name: request.body.newName}});
    if(chk1.length!=0) {
      request.flash("error", "An appointment is already scheduled with the same name!");
      return response.redirect("/appointments");      
    }
    await Appointments.update({name : request.body.newName, }, {where : { id : request.params.id }});    
    request.flash('success', 'Appointment updated successfully!');
    return response.redirect("/appointments");
  } catch (err) {
    console.error(err);
    request.flash('error', 'Failed to update Appointment.');
    return response.redirect("/appointments");
  }
});

app.delete(
  "/appointments/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Appointment with ID: ", request.params.id);
    try {
      const res = await Appointments.destroy({where : {id : request.params.id}});
      request.flash('success', `Appointment with id : ${request.params.id} was deleted successfully`);
      response.json({ success: true });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);
module.exports = app;
