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
    console.log("User ID : ", uid);
    const appointments = await Appointments.findAll({
      where : { uid : uid}
    });
    // const chk = await Appointments.findAll({
    //   where : {
    //     [Op.or] : {
    //       startTime : {
    //         [Op.gt]: startTime,
    //         [Op.lt]: endTime, 
    //       },
    //       endTime: {
    //         [Op.gt]: startTime,
    //         [Op.lt]: endTime,
    //       },
    //       [Op.and] : {
    //         startTime : {
    //           [Op.eq] : startTime,
    //         },
    //         endTime : {
    //           [Op.eq] : endTime,
    //         }
    //       }
    //     },
    //     uid: uid,
    //   }
    // });    
    const chk = await Appointments.findAll({
      where: {
        startTime: { [Op.lt]: endTime },
        endTime: { [Op.gt]: startTime },
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

    var flag = 0;
    if(chk.length!=0){
      var msg = "Sorry! Provided Time Period is Clashing with Appointment ids : [ ";
      // for(var i=0; i<appointments.length; ++i) {
      //   if(appointments[i].startTime>startTime && appointments[i].startTime < endTime){
      //     flag = 1;
      //     msg += appointments[i].id + ", "
      //     console.log("11111")
      //   }
      //   else if(appointments[i].endTime>startTime-1 && appointments[i].endTime<endTime){
      //     flag = 1;
      //     msg += appointments[i].id + ", "
      //     if(appointments[i].endTime>endTime)
      //     console.log("appointments[i].endTime>endTime")
      //     if(appointments[i].endTime>startTime)
      //     console.log("appointments[i].endTime>startTime")
      //   }
      //   else if(appointments[i].startTime===startTime && appointments[i].endTime===endTime)
      //   {
      //     flag = 1;
      //     msg += appointments[i].id + ", "
      //     console.log("33333")
      //   }
      // }
      // if(flag){
        msg += "]. Deletion of these Appointments enables you to schedule current Appointment."
        request.flash("error", msg);
        return response.redirect("/appointments");
      }
    // }
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
